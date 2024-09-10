import pipe from "../mod.ts";
import routeChecks from "./.pd/routeChecks/index.ts";

const output = await pipe(routeChecks.stages, routeChecks.json).process({});
if (output.errors?.length) {
    output.errors.map((error: any) => {
        console.log(error.name);
        console.log("function: ", error.func);
        console.log(error.message);
        console.log(error.stack);
        console.log("---");
    });
}
