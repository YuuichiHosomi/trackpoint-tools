import curry from 'lodash/fp/curry'
import attempt from 'lodash/fp/attempt'
import isError from 'lodash/fp/isError'
import isFunction from 'lodash/fp/isFunction'
import isArray from 'lodash/fp/isArray'
import _once from 'lodash/fp/once'
import propSet from 'lodash/fp/set'
import reduce from 'lodash/fp/reduce'
import memoize from 'lodash/fp/memoize'

function isThenable (f) {
    return f && isFunction(f.then)
}
function evalWithNoCatch(fn, args) {
    const _r = attempt(fn, args)
    if (isError(_r)) {
        console.error(_r)
    }
    return _r
}

// eval trackFn before fn
export const before = curry((trackFn, fn) => (...args) => {
    isFunction(trackFn) && evalWithNoCatch(trackFn, args)
    return fn.apply(this, args)
})

// eval trackFn after fn
export const after = curry((trackFn, fn) => (...args) => {
    const r = fn.apply(this, args)
    if (isThenable(r)) {
        return r.then(rr => {
            evalWithNoCatch(trackFn, args)
            return rr
        })
    }
    evalWithNoCatch(trackFn, args)
    return r
})

// track by decorator
/* class SomeComponent {
 *     @track(before(() => console.log('hello, trackpoint')))
 *     onClick = () => {
 *         ...
 *     }
 * }*/
export const track = curry(partical => (target, key, descriptor) => {
    return propSet('value', partical(descriptor.value), descriptor)
})

// composeWith convergeFn by ops[array]
export const composeWith = curry((convergeFn, ops) => {
    if (isFunction (ops)) {
        ops = [ops]
    }

    // type check
    if (!isFunction(convergeFn) ||!isArray(ops) ) {
        return console.error('args type incorrect, expect convergeFn is function and ops is array')
    }

    const compose = reduce(function (acc, i) {
        if (!acc) {
            return acc || i
        }
        return i(acc)
    }, null)


    return (fn) => (...args) => {
        const memoizeFn = memoize(fn)
        const _r = convergeFn(
            compose(ops)
                .apply(null, [memoizeFn])
                .apply(null, args)).apply(this, args)
        return memoizeFn.apply(this, args)
    }
})

export const time = (fn) => (...args) => {
    const begin = +Date.now()
    const result = fn.apply(this, args)
    // result will be cached by memoize, so return new promise
    if (isThenable(result)) {
        return result.then(() => +Date.now() - begin)
    }
    return +Date.now() - begin
}

// do work nothing
export const nop = () => {}

export const once = _once

export default {
    before,
    after,
    track,
    nop,
    once,
    composeWith,
    time
}
