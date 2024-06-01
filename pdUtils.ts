import type {Pipe, Input, Stage, Step} from "./pipedown.d.ts";
import $p from "jsr:@pd/pointers@0.1.0";

function funcWrapper<I extends Input>(funcs: Stage<I>[], opts: Pipe) {
  opts.$p = $p;

  return funcs
    // associate configuration with function
    .map((func, index: number): { func: Stage, config: Step['config'] } => {
      const config: Step['config'] = Object.assign(
        { checks: [], not: [], or: [], and: [], routes: [], only: false, stop: false},
        $p.get(opts, '/steps/' + index + '/config')
      )
      return { func, config }
    })
    // wrap function with configuration checks
  .map(({func, config}, index) => async function(input: I) {
    const only = config.only || input?.only
    if(only && only !== index) return input

    const stop = config.stop || input?.stop
    if(index > stop) return input;

    if (input?.errors && input.errors.length > 0) return input;


    // if check is truthy, bail early
    const shouldBeFalsy = config.not.map((check: string) => $p.get(input, check)).some((check: boolean) => check)
    if(shouldBeFalsy) return input;

    /**
     * With no 'and' or 'or' conditions, any 'checks' that are truthy will run the function
     * any 'and' conditions that are falsy will not run the function
     * any 'or' conditions that are truthy will run the function
    */

    const checker = (check: string): string[] => {
      return [check.split('/').pop() || check, $p.get(input, check)]
    }

    const validator: 'some'|'every' = config.and.length ? 'every' : 'some';
    const conditions: string[][] = config.checks.map(checker).concat(config.and.map(checker))
    const orConditions = config.or.map(checker)
    
    if(conditions.length){
      const firstChecks = conditions[validator](([_key,value]) => !!value)
      const orChecks = orConditions.some(([_key,value]: string[]) => !!value)
      
      if(firstChecks){
        $p.set(opts, '/checks', Object.fromEntries(conditions));
      } 
      else if(orChecks) {
         $p.set(opts, '/checks', Object.fromEntries(orConditions));
        } else {
          return input;
      }
    }
        
    if(config.routes.length && input.request){
      const route = config.routes
      .map((route: string) => new URLPattern({ pathname: route }))
      .find((route: URLPattern) => {
        return route.test(input.request.url);
      })
      
      if(!route) return input

      input.route = route.exec(input.request.url);
    }

    try {
        await func(input, opts);
    } catch (e) {
      input.errors = input.errors || [];
      input.errors.push({
        message: e.message,
        stack: e.stack,
        name: e.name,
        func: func.name,
      });
    }

    return input;
  })
  .map((func, index) => {
    Object.defineProperty(func, 'name', { value: `${index}-${funcs[index].name}` });
    return func;
  })
}

export { funcWrapper };
export default funcWrapper;
