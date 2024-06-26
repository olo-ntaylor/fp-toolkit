/**
 * The `Async` type represents a "lazy" or "cold" asynchronous
 * operation. This is in contrast to the default behavior of the
 * `Promise` type, which is "hot" by nature. That is, once you have
 * instantiated a `Promise`, whatever asynchronous or background
 * work it represents has already begun.
 *
 * The `Async` type is intended to be used to model computations that
 * should never fail. (Meaning, if a failure does occur, it is likely an
 * exceptional case and throwing an Error makes sense.) If you need
 * to model asynchronous computations that may fail, please use `AsyncResult`.
 *
 * The primary motivation for using a "cold" `Async` type is to
 * enable things like
 *
 * * deciding whether to use in-parallel or in-series sequencing
 * * avoiding unnecessary work (If an `Async` is constructed, but
 *   never started, no work is performed.)
 *
 * This API is curried and has been optimized for use right-to-left
 * function composition like `pipe` or `flow`.
 *
 * @example
 * ```ts
 * await pipe(
 *     [
 *         () => doThing1Async(),                   // `doThing1Async` returns a Promise
 *         () => doThing2Async(),                   // `doThing2Async` returns a Promise
 *     ],                                           // Async<string>[]
 *     Async.sequential,                            // Async<readonly string[]>
 *     Async.map(Array.map(s => s.toLowerCase())),  // Async<readonly string[]>
 *     Async.start                                  // Promise<readonly string[]>
 * ) // => ["completed thing 1", "completed thing 2"]
 * ```
 *
 * @module Async
 */

/** Represents a "lazy" or "cold" `Promise`. (See module-level documentation for more.) */
export interface Async<A> {
    (): Promise<A>
}

/**
 * Constructs an Async from a raw value. Primarily useful for
 * writing tests, or for coercing some value into an Async for
 * use in a pipeline.
 *
 * @group Constructors
 *
 * @example
 * await Async.of(42)() // => 42
 */
export const of =
    <A>(a: A): Async<A> =>
    () =>
        Promise.resolve(a)

/**
 * Maps the inner value using the given function, producing
 * a new `Async`.
 *
 * @group Mapping
 *
 * @example
 * declare const getSecretValueFromApi: () => Promise<number>
 *
 * await pipe(
 *     getSecretValueFromApi,   // assume always returns 1
 *     Async.map(n => n + 1),   // Async<number>
 *     Async.start              // Promise<number>
 * ) // => 2
 */
export const map =
    <A, B>(f: (a: A) => B) =>
    (async: Async<A>): Async<B> =>
    () =>
        async().then(f)

/**
 * Maps the inner value using the given function which also
 * returns an `Async`, and flattens the result. Also called
 * `flatMap`.
 *
 * @group Mapping
 *
 * @example
 * ```
 * await pipe(
 *     Async.of("a"),
 *     Async.bind(s => Async.of(`${s}+b`)),
 *     Async.start
 * ) // => "a+b"
 * ```
 */
export const bind =
    <A, B>(f: (a: A) => Async<B>) =>
    (async: Async<A>): Async<B> =>
    () =>
        async().then(a => f(a)())

/**
 * Alias of {@link bind}.
 *
 * @group Mapping
 */
export const flatMap = bind

/**
 * Unwraps a nested `Async<Async<A>>` structure so that
 * the inner value is only wrapped in a single `Async`.
 * (Note: {@link bind} can be thought of as just a map +
 * flatten operation.)
 *
 * @group Mapping
 *
 * @example
 * const nested = Async.of(Async.of(30))   // => Async<Async<number>>
 * const flattened = Async.flatten(nested) // => Async<number>
 */
export const flatten =
    <A>(async: Async<Async<A>>): Async<A> =>
    () =>
        async().then(inner => inner())

/**
 * An `Async` of an arbitrary non-nullish value. Useful for
 * adding delays at the beginning of a pipeline. Mostly used
 * in writing test code.
 *
 * @group Utils
 *
 * @example
 * ```
 * // Add a delay to the beginning of an `Async` pipeline
 * pipe(
 *     Async.unit,
 *     Async.delay(5_000),      // wait 5 seconds
 *     Async.map(console.log)
 * ) // logs `{}` after 5 seconds
 * ```
 */
export const unit: Async<unknown> = of({})

/**
 * Adds an arbitrary delay to an `Async` computation.
 *
 * @group Utils
 *
 * @param delayInMilliseconds Normalized to a non-negative integer.
 *
 * @example
 * ```ts
 * pipe(
 *     Async.unit,
 *     Async.delay(5000), // wait 5 seconds
 *     Async.map(console.log)
 * ) // logs `{}` after 5 seconds
 * ```
 */
export const delay =
    (delayInMilliseconds: number) =>
    <A>(async: Async<A>): Async<A> =>
    async () => {
        const delay =
            delayInMilliseconds <= 0 ? 0 : Math.floor(delayInMilliseconds)
        await new Promise(resolve => setTimeout(resolve, delay))

        return await async()
    }

/**
 * Converts an array of `Async` computations into a single `Async`
 * computation that represents the in-series execution of each
 * individual `Async` computation.
 *
 * @group Sequencing
 *
 * @remarks
 * Order is guaranteed. The order of the given computations will be
 * preserved in the resultant array.
 */
export const sequential =
    <A>(asyncs: readonly Async<A>[]): Async<readonly A[]> =>
    async () => {
        const results: A[] = []

        for (let i = 0; i < asyncs.length; i++) {
            results.push(await asyncs[i]())
        }

        return results
    }

/**
 * Invokes the `Async`. Identical to calling the `Async` as
 * a function. Useful for more expressive function pipelines.
 *
 * @group Utils
 *
 * @returns A `Promise` that will resolve to the result of the `Async` computation.
 *
 * @example
 * // simply invoke
 * const a = await Async.of(1)(); // => 1
 * // use a named function, useful for pipelining
 * const b = await pipe(
 *     Async.of(1),
 *     Async.start
 * ) // => 1
 */
export const start = <A>(async: Async<A>): Promise<A> => async()

/**
 * Converts an array of `Async` computations into one `Async` computation
 * which represents the in-parallel execution of all the given `Async`
 * computations.
 *
 * @group Sequencing
 *
 * @remarks
 * This is effectively an alias for `Promise.all`. Order is not guaranteed.
 */
export const parallel =
    <A>(asyncs: readonly Async<A>[]): Async<readonly A[]> =>
    () =>
        Promise.all(asyncs.map(start))

/**
 * Wraps a `Promise` inside an `Async`.
 *
 * @group Constructors
 * @group Utils
 *
 * @remarks
 * **Note:** this does not mean that the given promise is made "cold."
 * By definition, the given `Promise` is already "hot" when it is passed
 * to this function.
 *
 * If you want to convert a function that returns a `Promise` into a
 * function that returns an `Async`, see {@link asyncify}.
 *
 * @example
 * declare const safeWriteToFile: (content: string) => Promise<number>;
 * // Promises are always "hot" as soon as they are instantiated
 * const statusPromise = safeWriteToFile("I love cheese"); // => Promise<number>
 * const statusAsync = Async.ofPromise(statusPromise);     // => Async<number>
 */
export const ofPromise =
    <A>(promise: Promise<A>): Async<A> =>
    () =>
        promise

/**
 * Converts a function that returns a `Promise` into one that returns
 * an `Async` instead.
 *
 * @group Utils
 */
export const asyncify =
    <F extends (...args: any[]) => Promise<any>>(
        f: F
    ): ((...args: Parameters<F>) => Async<Awaited<ReturnType<F>>>) =>
    (...args: Parameters<F>) =>
    () =>
        f(...args)
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Execute an arbitrary side-effect within a pipeline of
 * `Async` functions. Useful for logging and debugging.
 * Passes the inner value through unchanged. This function
 * is sometimes called `do` or `tap`.
 *
 * @group Utils
 *
 * @param f Should not mutate its arguments. See {@link map} if you want to map the inner value.
 *
 * @example
 * ```ts
 * await pipe(
 *     Async.of(20),
 *     Async.delay(2_000),
 *     Async.tee(console.log), // logs `20` after 2 seconds
 *     Async.map(double),      // double receives the un-altered value `20`
 *     Async.start
 * ) // => 40 (after 2 seconds)
 * ```
 */
export const tee =
    <A>(f: (a: A) => void) =>
    (async: Async<A>): Async<A> =>
    async () => {
        const a = await async()
        f(a)
        return a
    }

/**
 * `Async` computation that never resolves. Primarily useful
 * for writing test code.
 *
 * @group Utils
 */
export const never: Async<never> = () => new Promise(() => {})
