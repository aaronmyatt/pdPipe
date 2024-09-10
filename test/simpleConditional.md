# SC
With these latest changes checking for conditionals in a list that a codeblock is embedded can get quite complex. At this time I feel it is sufficiently extensive to provide more utility but not so comprehensive that there wont be occasions one would fall back to traditional logic handling.

However, the 

## testInput
Given a function
When it has no conditions
Then it will be run
```ts
$p.set(input, '/trigger', true)
$p.set(input, '/andTrigger', false)
$p.set(input, '/orTrigger', true)
```

## oneConditionTruthy
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When it has a truthy pointer
Then it will be run
- if: /trigger
- ```ts
    import { assert, assertFalse, assertObjectMatch, unreachable } from "jsr:@std/assert";
    assert(input.trigger);
    console.log('pass: oneConditionTruthy')
    ```

## oneConditionFalsy
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When it has a falsy pointer
Then it will **not** be run
- if: /skip
- ```ts
    unreachable();
    ```

```ts
console.log('pass: oneConditionFalsy')
```

## twoCheckConditions
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When the function has at least one truthy pointer
Then it will be run
- if: /trigger
- if: /andTrigger
- ```ts
    assert(input.trigger);
    assertFalse(input.andTrigger)
    console.log('pass: twoCheckConditions')
    ```

## oneCheckOneAndCondition
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When any pointer is falsy
Then it will **not** be run
- if: /trigger
- and: /andTrigger
- ```ts
    unreachable();
    ```

```ts
console.log('pass: oneCheckOneAndCondition')
```

## orCondition
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When the **or** pointer is truthy
Then it will be run
- if: /trigger
- and: /andTrigger
- or: /orTrigger
- ```ts
    assert(input.orTrigger)
    ```

```ts
console.log('pass: orCondition')
$p.set(input, '/andTrigger', true)
```

## andCondition
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When the **if + and** pointers are truthy
Then it will be run
- if: /trigger
- and: /andTrigger
- or: /orTrigger
- ```ts
    assert(input.orTrigger)
    console.log('pass: andCondition')
    ```

## notCondition
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When the *not* pointers are falsy
Then it will run
- not: /skip
- ```ts
    assertFalse(input.skip)
    console.log('pass: notCondition')
    ```

## notOnTruthy
Given a function
Given an input with input {trigger: true, andTrigger: false, orTrigger: true}
When the *not* pointers are truthy
Then it will *not* run
- not: /trigger
- ```ts
    unreachable('fail: notOnTruthy');
    ```
```ts
console.log('pass: notOnTruthy')
```

```ts
$p.set(input, '/triggerMore', true)
$p.set(input, '/andTriggerMore', true)
$p.set(input, '/orTriggerMore', true)
```

## multiCheckWithAnd
- if: /trigger
- if: /triggerMore
- and: /andTrigger
- ```ts
    assertObjectMatch(opts.checks, { trigger: true, triggerMore: true, andTrigger: true })
    console.log('pass: multiCheckWithAnd')
    ```

## multiCheckMultiAnd
- if: /trigger
- if: /triggerMore
- and: /andTrigger
- and: /andTriggerMore
- ```ts
    assertObjectMatch(opts.checks, { trigger: true, triggerMore: true, andTrigger: true, andTriggerMore: true })
    console.log('pass: multiCheckMultiAnd')
    ```

## multiCheckMultiAndOrIgnored
- if: /trigger
- if: /triggerMore
- and: /andTrigger
- and: /andTriggerMore
- or: /orTrigger
- ```ts
    assertObjectMatch(opts.checks, { trigger: true, triggerMore: true, andTrigger: true, andTriggerMore: true })
    console.log('pass: multiCheckMultiAndOrIgnored')
    ```

## oneFailToOr
- if: /trigger
- if: /triggerMore
- and: /andTrigger
- and: /skip
- or: /orTrigger
- ```ts
    assertObjectMatch(opts.checks, { orTrigger: true })
    console.log('pass: oneFailToOr')
    ```

## multiOr
- if: /trigger
- if: /triggerMore
- and: /andTrigger
- and: /skip
- or: /orTrigger
- or: /orTriggerMore
- ```ts
    assertObjectMatch(opts.checks, { orTrigger: true, orTriggerMore: true })
    console.log('pass: multiOr')
    ```

## falsyOrIgnored
We only need a single **or** check to be truthy

- if: /trigger
- if: /triggerMore
- and: /andTrigger
- and: /skip
- or: /orTrigger
- or: /orTriggerMore
- or: /skip
- ```ts
    assertObjectMatch(opts.checks, { orTrigger: true, orTriggerMore: true })
    console.log('pass: falsyOrIgnored')
    ```

## notOverridesComplexConditions
- not: /trigger
- if: /trigger
- if: /triggerMore
- and: /andTrigger
- and: /skip
- or: /orTrigger
- or: /orTriggerMore
- or: /skip
- ```ts
    unreachable('fail: notOverridesComplexConditions')
    ```
```ts
console.log('pass: notOverridesComplexConditions')
```

Just the example from the [docs](https://jsr.io/@std/cli/doc/~/parseArgs)
```ts
input.flags = { foo: true, bar: "baz", _: ["./quux.txt"] }
```
## flagCheck
- flags: /foo
- ```ts
    assertObjectMatch(opts.checks, { foo: true })
    console.log('pass: flagCheck')
    ```

## flagArgCheck
- flags: /_/0
- ```ts
    assertObjectMatch(opts.checks, { 0: "./quux.txt" })
    console.log('pass: flagArgCheck')
    ```
