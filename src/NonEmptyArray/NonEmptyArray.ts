/**
 * A `NonEmptyArray` is an array that is guaranteed by the type system to have
 * at least one element. This type is useful for correctly modeling certain
 * behaviors where empty arrays are absurd. It also makes it safer to work with
 * functionality like destructuring the array or getting the first value.
 *
 * **Note:** A `NonEmptyArray` is just a _more specific_ type of readonly array,
 * so any functions from the `Array` module can also be used with `NonEmptyArray`s.
 *
 * @module NonEmptyArray
 */

import { EqualityComparer } from "../EqualityComparer"
import { OrderingComparer } from "../OrderingComparer"

/** Represents a readonly array with at least one element. */
export interface NonEmptyArray<A> extends ReadonlyArray<A> {
    0: A
}

/**
 * Get the first element of a non-empty array.
 *
 * @group Utils
 * @group Pattern Matching
 */
export const head = <A>(as: NonEmptyArray<A>) => as[0]

/**
 * Alias of {@link head}.
 *
 * @group Pattern Matching
 * @group Utils
 */
export const first = head

/**
 * Destructure the non-empty array into an object containing
 * the head and the tail.
 *
 * @group Pattern Matching
 *
 * @example
 * NonEmptyArray.destruct([1, 2, 3]) // => { head: 1, tail: [2, 3] }
 */
export const destruct = <A>(
    as: NonEmptyArray<A>
): {
    readonly head: A
    readonly tail: readonly A[]
} => ({
    head: as[0],
    tail: as.slice(1),
})

/**
 * Curried version of the built-in map that maintains
 * strong NonEmptyArray typing.
 *
 * @group Mapping
 *
 * @returns A new non-empty array containing the mapped elements.
 */
export const map =
    <A, B>(f: (a: A) => B) =>
    (as: NonEmptyArray<A>): NonEmptyArray<B> =>
        as.map(f) as unknown as NonEmptyArray<B>

/**
 * Uses the given function to map each element into a non-empty array,
 * then flattens the results. Commonly called flatMap` or `chain`.
 *
 * @group Mapping
 *
 * @returns A new non-empty array containing the mapped/flattened elements.
 */
export const bind =
    <A, B>(f: (a: A) => NonEmptyArray<B>) =>
    (as: NonEmptyArray<A>): NonEmptyArray<B> =>
        as.flatMap(f) as unknown as NonEmptyArray<B>

/**
 * Alias for {@link bind}.
 *
 * @group Mapping
 */
export const flatMap = bind

/**
 * Constructs a new non-empty array containing exactly one element.
 *
 * @group Constructors
 */
export const of = <A>(a: A): NonEmptyArray<A> => [a]

/**
 * Create a new array by enumerating the integers between
 * the given start and end, inclusive of both start and end.
 *
 * Both start and end are normalized to integers, and end is
 * normalized to always be at least equal to start.
 *
 * @group Constructors
 * @group Utils
 *
 * @example
 * NonEmptyArray.range(1, 5)    // => [1, 2, 3, 4, 5]
 * NonEmptyArray.range(-10, 1)  // => [-10, -9, -8, ..., 1]
 * NonEmptyArray.range(2, -5)   // => [2]
 * NonEmptyArray.range(1, 1)    // => [1]
 */
export const range = (
    startInclusive: number,
    endInclusive: number
): NonEmptyArray<number> => {
    const start = Math.floor(startInclusive)
    const end = Math.floor(endInclusive)

    if (start >= end) {
        return [start]
    }

    const out: number[] = []
    for (let i = start; i <= end; i++) {
        out.push(i)
    }
    return out as unknown as NonEmptyArray<number>
}

/**
 * Construct a new non-empty array with the specified number
 * of elements, using a constructor function for each element
 * that takes a zero-based index of the element being constructed.
 *
 * @param length is normalized to a non-negative integer
 *
 * @group Constructors
 * @group Utils
 *
 * @example
 * ```
 * NonEmptyArray.make(3, i => `${i}`) // => ["0", "1", "2"]
 * ```
 */
export const make = <A>(
    length: number,
    createElement: (i: number) => A
): NonEmptyArray<A> => {
    const n = length <= 1 ? 1 : Math.floor(length)
    return [...Array(n).keys()].map(
        createElement
    ) as unknown as NonEmptyArray<A>
}

/**
 * Reverses an array. Preserves correct types.
 *
 * @group Utils
 *
 * @returns A new non-empty array with elements in reverse order.
 *
 * @example
 * pipe(
 *  NonEmptyArray.range(1, 5),
 *  NonEmptyArray.reverse
 * ) // => [5, 4, 3, 2, 1]
 */
export const reverse = <A>(as: NonEmptyArray<A>): NonEmptyArray<A> =>
    as.slice(0).reverse() as unknown as NonEmptyArray<A>

/**
 * Sort the array using the given `OrderingComparer`, or the default
 * ASCII-based comparer if not given.
 *
 * @group Utils
 *
 * @returns A new non-empty array with elements sorted.
 */
export const sort =
    <A>(orderingComparer: OrderingComparer<A> = OrderingComparer.Default) =>
    (as: NonEmptyArray<A>): NonEmptyArray<A> =>
        as
            .slice(0)
            .sort(orderingComparer.compare) as unknown as NonEmptyArray<A>

/**
 * Get an `EqualityComparer` that represents structural equality for a non-empty array
 * of type `A` by giving this function an `EqualityComparer` for each `A` element.
 *
 * @group Equality
 * @group Utils
 *
 * @param equalityComparer The `EqualityComparer` to use for element-by-element comparison.
 *
 * @returns A new `EqualityComparer` instance
 */
export const getEqualityComparer = <A>({
    equals,
}: EqualityComparer<A>): EqualityComparer<NonEmptyArray<A>> =>
    EqualityComparer.ofEquals((arr1, arr2) => {
        if (arr1.length !== arr2.length) {
            return false
        }

        for (let i = 0; i < arr1.length; i++) {
            if (!equals(arr1[i], arr2[i])) {
                return false
            }
        }

        return true
    })
