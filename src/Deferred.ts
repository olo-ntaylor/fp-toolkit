/**
 * The `Deferred` type represents the state of some asynchronous operation. The
 * operation can either be `NotStarted`, `InProgress`, or `Resolved`. When the
 * operation is resolved, it has some data attached to it that represents the
 * outcome of the asyncrhonous work.
 *
 * This type is frequently used with `Result` as the data of the `Resolved`
 * branch, because it is a common situation to model the outcome of an asynchronous
 * operation that can fail.
 *
 * This type is especially helpful in Redux stores (or in the React `useReducer`
 * state) because it allows you to determinstically model the state of an async
 * operation as one value. I.e., instead of using separate flags that are
 * _implicitly_ related to each other (e.g., `notStarted`, `loading`, `result`),
 * you know for a fact that the async work can only be in one of three states,
 * and the data present on the resolved state is _only_ present on the resolved
 * state.
 *
 * @module
 *
 * @example
 * declare const def: Deferred<ApiResponse>
 *
 * pipe(
 *     def,
 *     Deferred.match({
 *         notStarted: "Not Started",
 *         inProgress: "In Progress",
 *         resolved: response => response.body
 *     })
 * )
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { Tagged, assertExhaustive } from "./prelude"
import { pipe } from "./composition"
import { EqualityComparer } from "./EqualityComparer"

/** The `NotStarted` type. */
export interface NotStarted extends Tagged<"NotStarted", object> {}

/** The `InProgress` type. */
export interface InProgress extends Tagged<"InProgress", object> {}

/** The `Resolved` type. */
export interface Resolved<A> extends Tagged<"Resolved", { resolved: A }> {}

/** A discriminated union type representing a `Deferred` value. */
export type Deferred<A> = NotStarted | InProgress | Resolved<A>

/**
 * The static `NotStarted` instance.
 *
 * @group Constructors
 */
const notStarted: Deferred<never> = Object.freeze({ _tag: "NotStarted" })

/**
 * The static `InProgress` instance.
 *
 * @group Constructors
 */
const inProgress: Deferred<never> = Object.freeze({ _tag: "InProgress" })

/**
 * Construct a new `Resolved` instance with the given data attached.
 *
 * @param a The data that will be wrapped in the `Deferred`.
 *
 * @group Constructors
 */
const resolved = <A>(a: A): Deferred<A> => ({ _tag: "Resolved", resolved: a })

/** @ignore */
interface DeferredMatcher<A, R> {
    readonly notStarted: (() => R) | R
    readonly inProgress: (() => R) | R
    readonly resolved: ((a: A) => R) | R
}

/** @ignore */
interface PartialDeferredMatcher<A, R> extends Partial<DeferredMatcher<A, R>> {
    readonly orElse: (() => R) | R
}

type Func<T> = (...args: any[]) => T

type FuncOrValue<T> = Func<T> | T

const resultOrValue = <T>(f: FuncOrValue<T>, ...args: any[]) => {
    const isFunc = (f: FuncOrValue<T>): f is Func<T> => typeof f === "function"
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return isFunc(f) ? f(...args) : f
}

/**
 * Exhaustively pattern match against a `Deffered` value. Provide either
 * a value or a lambda to use for each case. If you provide a lambda to the
 * `resolved` case, it will be given the data associated with the `Resolved`
 * instance.
 *
 * See docs for {@link Deffered} for example.
 *
 * @param matcher The matcher object to use.
 *
 * @group Pattern Matching
 *
 * @example
 * ```
 * declare const def: Deferred<MyApiResponse>
 * pipe(
 *     def,
 *     Deferred.match({
 *         notStarted: "",
 *         inProgress: "Loading...",
 *         resolved: resp => resp?.body ?? ""
 *     })
 * ) // => the string produced in each case, depending on the value of `def`
 * ```
 */
export const match =
    <A, R>(matcher: DeferredMatcher<A, R>) =>
    (deferred: Deferred<A>) => {
        switch (deferred._tag) {
            case "NotStarted":
                return resultOrValue(matcher.notStarted)
            case "InProgress":
                return resultOrValue(matcher.inProgress)
            case "Resolved":
                return resultOrValue(matcher.resolved, deferred.resolved)
            /* c8 ignore next 2 */
            default:
                return assertExhaustive(deferred) as R
        }
    }

/**
 * Non-exhaustive pattern match against a `Deferred`. Provide a lambda or raw value
 * to return for the various cases. (But don't specify all the cases. You should use
 * {@link match} if you want exhaustive case checking.) Then also provide a raw value
 * or lambda to use for the `orElse` case if the check falls through all other cases.
 *
 * @group Pattern Matching
 *
 * @example
 * ```
 * declare const def: Deferred<number>
 * pipe(
 *     def,
 *     Deferred.matchOrElse({
 *         resolved: statusCode => `Status: ${statusCode}`,
 *         orElse: 'Not Finished' // effectively captures both "in progress" and "not started" cases together
 *     })
 * )
 * ```
 */
export const matchOrElse =
    <A, R>(matcher: PartialDeferredMatcher<A, R>) =>
    (deferred: Deferred<A>) => {
        switch (deferred._tag) {
            case "NotStarted":
                return resultOrValue(
                    matcher.notStarted != null ? matcher.notStarted : matcher.orElse
                )
            case "InProgress":
                return resultOrValue(
                    matcher.inProgress != null ? matcher.inProgress : matcher.orElse
                )
            case "Resolved":
                return matcher.resolved != null
                    ? resultOrValue(matcher.resolved, deferred.resolved)
                    : resultOrValue(matcher.orElse)
            /* c8 ignore next 2 */
            default:
                return resultOrValue(matcher.orElse)
        }
    }

/**
 * Get whether the `Deferred` is either in progress or not started.
 *
 * @group Utils
 */
export const isUnresolved: <A>(deferred: Deferred<A>) => boolean = matchOrElse({
    resolved: false,
    orElse: true,
})

/**
 * Gets whether the `Deferred` is in progress.
 *
 * @group Utils
 */
export const isInProgress = <A>(deferred: Deferred<A>): deferred is InProgress =>
    pipe(
        deferred,
        matchOrElse({
            inProgress: true,
            orElse: false,
        })
    )

/**
 * Gets whether the `Deferred` is resolved.
 *
 * @group Utils
 */
export const isResolved = <A>(deferred: Deferred<A>): deferred is Resolved<A> =>
    pipe(
        deferred,
        matchOrElse({
            resolved: true,
            orElse: false,
        })
    )

/**
 * Gets whether the `Deferred` is resolved with data equal to a specific value.
 * Uses the `EqualityComparer` if given, otherwise defaults to reference (triple
 * equals) equality.
 *
 * @group Pattern Matching
 * @group Utils
 *
 * @example
 * pipe(
 *     Deferred.resolved(101),
 *     Deferred.isResolvedWith(100, EqualityComparer.Number)
 *     // number is just a trivial example here, not required
 * ) // => false
 */
export const isResolvedWith = <A>(
    expected: A,
    equalityComparer: EqualityComparer<A> = EqualityComparer.Default
) =>
    matchOrElse<A, boolean>({
        resolved: actual => equalityComparer.equals(actual, expected),
        orElse: false,
    })

/** @ignore */
export const Deferred = {
    notStarted,
    inProgress,
    resolved,
    match,
    matchOrElse,
    isUnresolved,
    isResolved,
    isInProgress,
    isResolvedWith,
}