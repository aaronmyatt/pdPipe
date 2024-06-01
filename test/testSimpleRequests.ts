import pipe from "../mod.ts"
import simpleRequests from "./.pd/simpleRequests/index.ts"
import simpleServer from "./.pd/simpleServer/index.ts"

const server = pipe(simpleServer.stages, simpleServer.json)

const output = await pipe(simpleRequests.stages, simpleRequests.json).process({server})
if(output.errors?.length) {
    output.errors.map((error: any) => {
        console.log(error.name)
        console.log('function: ', error.func)
        console.log(error.message)
        console.log(error.stack)
        console.log('---')
    })
}