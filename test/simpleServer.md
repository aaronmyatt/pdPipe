# SS
A dummy "server", which, of course, is just a pipe! We will use this to see if any of the requests match a URL pattern.

```ts
import { assert, assertFalse, assertObjectMatch } from "jsr:@std/assert";
```

## simpleMatch
- route: /match
    ```ts
    assert(input.route, '/match');
    console.log('pass: simpleMatch');
    ```


```ts
$p.set(input, '/method/'+input.request.method, true)
```
## simplePost
I have had an item on my list to make combining `input` checks and route checks possible. By writting these tests (hooray) it occurred to me they already are - sorta. We can add `checks` and `routes`, but the checks will need to resolve truthy before the route is even read. But, `/request/method` will always be truthy.. which is unhelpful. We can add the method to the input `$p.set(input, '/method/'+request.method, true)` (👆), or extend `Request` somehow - `input.request.pmethod = {get: true}`. This would need to be done on every request which might be fine... I'll think on it.
- route: /matchPost
- when: /method/POST
    ```ts
    assert(input.route, '/match');
    console.log('pass: matchPost');
    ```

## simpleGroup
- route: /company/:companyId/user/:userId
- ```ts
    assert($p.get(input, '/route/pathname/groups/companyId'), '/companyId');
    assert($p.get(input, '/route/pathname/groups/userId'), '/userId');
    console.log('pass: simpleGroup');
    ```
