import pipe from "../mod.ts"
import simpleConditional from "./.pd/simpleConditional/index.ts"

const output = await pipe(simpleConditional.stages, simpleConditional.json).process({})
if(output.errors?.length) {
    output.errors.map((error: any) => {
        console.log(error.name)
        console.log('function: ', error.func)
        console.log(error.message)
        console.log(error.stack)
        console.log('---')
    })
}