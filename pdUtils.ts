import type {Pipe, Input, Stage} from "./pipedown.d.ts";
import $p from "jsr:@pd/pointers@0.1.0";

function funcWrapper<I extends Input>(funcs: Stage<I>[], opts: Pipe) {
  opts.$p = $p;

  return funcs.map((func, index: number) => async function(input: I) {
    const funcConfig = $p.get(opts, '/steps/' + index + '/config')

    if(funcConfig && funcConfig.checks && funcConfig.checks.length > 0){
      const checks = funcConfig.checks.reduce((acc: Pipe['checks'], check: string) => {
        acc[check] = $p.get(input, check)
        return acc
      }, {} as Pipe['checks'])
      opts.checks = checks
      if(!Object.values(checks).some(check => !!check)){
        return input
      }
    }

    if(funcConfig && funcConfig.routes && input.request){
      const route = funcConfig.routes
      .map((route: string) => new URLPattern({ pathname: route }))
      .find((route: URLPattern) => {
        return route.test(input.request.url);
      })

      if(!route){
        return input
      }

      input.route = route.exec(input.request.url);
    }

    const only = (funcConfig && funcConfig.only) || input.only
    if(only && only !== index){
      return input
    }

    const stop = (funcConfig && funcConfig.stop) || input.stop
    if(index > stop){
      return input
    }

    if (input.errors && input.errors.length > 0) {
      return input;
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
export default funcWrapper
