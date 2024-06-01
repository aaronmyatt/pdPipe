# SR
Turns out I borked the route checks. I think the `conditional` array always has come items in them. Even if they are empty arrays themselves they will result in `conditionals.length` returning a positive and truthy value.

Let's write a bunch of tests for requests and make sure we don't regress again!

```ts
import { assert, assertFalse, assertObjectMatch } from "jsr:@std/assert";
```

## aRequest
So, the joy of working with Deno is that we can use the basic web standard Request and Response objects on both the server and client. So testing _should_ be quite straightforward (and opens up some exciting possibilities for a _real_ testing framework made with Pipedown).

However, hand crafting these requests I am confident will be error prone. I'm not going to to try and over engineer or over research at this point as I jut want to make sure that the URLPatterns are being matched correctly.
```ts
$p.set(input, '/request', new Request('http://localhost:8080/noMatch'))
const output = await input.server.process(input);
assertFalse(output.route, '/noMatch');
console.log('pass: noMatch');
```

## shouldMatch

> Found a bug! An empty array is truthy, try: `!![]`. So when checking for `routes: []` checks, any time an `input.request` is present, it'll cause subsequent codeblocks to be skipped. This was also causing a whole lot of redundant route checks.

```ts
$p.set(input, '/request', new Request('http://localhost:8080/match'))
const output = await input.server.process(input);
assert(output.route, '/match');
console.log('pass: /match');
```

## shouldMatchPost
```ts
$p.set(input, '/request', new Request('http://localhost:8080/matchPost', {
    method: 'POST',
}))
const output = await input.server.process(input);
assert(output.route, '/matchPost');
console.log('pass: /matchPost');
```

## shouldExtractGroups
```ts
$p.set(input, '/request', new Request('http://localhost:8080/company/1/user/1'))
const output = await input.server.process(input);
assert(output.route, '/matchGroup');
console.log('pass: /matchGroup');
```

