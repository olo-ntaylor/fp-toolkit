import { pipe } from "../Composition"
import { EqualityComparer } from "../EqualityComparer"
import { Option } from "../Option"
import { OrderingComparer } from "../OrderingComparer"
/**
 * A suite of useful functions for working with the built-in `Map` type.
 *
 * @module Map
 */
import type { NonNullish, Predicate } from "../prelude"

/**
 * Lookup a key/value pair (wrapped in a `Some`) from a `Map` using the given key.
 * If the `Map` doesn't contain the key, returns `None`.
 *
 * Uses the given equality comparer if passed. Otherwise, defaults to reference
 * equality (triple equals) for equality comparisons.
 *
 * @group Lookups
 *
 * @returns An `Option` containing a tuple of the key and value.
 */
export const findWithKey =
    <K>(
        key: NoInfer<K>,
        { equals }: EqualityComparer<NoInfer<K>> = EqualityComparer.Default
    ) =>
    <V>(map: ReadonlyMap<K, V>): Option<readonly [K, V]> => {
        if (map.size < 1) {
            return Option.none
        }

        for (const [k, v] of map) {
            if (equals(k, key)) {
                return Option.some([k, v])
            }
        }

        return Option.none
    }

/**
 * Test whether a `Map` contains the given key. Uses the given `EqualityComparer`
 * if passed. Otherwise, defaults to reference equality (triple equals).
 *
 * @group Lookups
 *
 * @returns `true` if the key is in the `Map`, `false` otherwise.
 */
export const containsKey =
    <K>(key: NoInfer<K>, equalityComparer?: EqualityComparer<NoInfer<K>>) =>
    <V>(map: ReadonlyMap<K, V>): boolean =>
        pipe(map, findWithKey(key, equalityComparer), Option.isSome)

/**
 * Get a value associated with the given key from the `Map`. Returns a `Some`
 * containing the value, or `None` if the key is not in the `Map`.
 *
 * Uses the given equality comparer if passed, otherwise defaults to using
 * reference equality (triple equals) for equality comparison.
 *
 * @group Lookups
 */
export const find =
    <K>(key: NoInfer<K>, equalityComparer?: EqualityComparer<NoInfer<K>>) =>
    <V extends NonNullish>(map: ReadonlyMap<K, V>): Option<V> =>
        pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.map(([, v]) => v)
        )

/**
 * Adds a key/value pair to a `Map`. If the given key already exists
 * the value at that key will be updated with the given value.
 *
 * Will use the equality comparer if given, otherwise defaults to using
 * reference equality (triple equals) for equality comparisons.
 *
 * @group Transformations
 *
 * @returns A new `Map` with the added key/value pair
 */
export const set =
    <K, V>(
        [key, value]: readonly [K, V],
        equalityComparer?: EqualityComparer<K>
    ) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> => {
        if (map.size < 1) {
            const out = empty<K, V>()
            out.set(key, value)
            return out
        }

        const copy = new globalThis.Map(map)

        return pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.match({
                none: () => {
                    copy.set(key, value)
                    return copy
                },
                some: ([k]) => {
                    copy.set(k, value)
                    return copy
                },
            })
        )
    }

/**
 * Make a new `Map` by producing a new each value for each key using
 * the given function.
 *
 * @group Mapping
 * @group Transformations
 */
export const map =
    <K, V, R>(f: (k: NoInfer<K>, v: NoInfer<V>) => R) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, R> => {
        if (map.size < 1) {
            return empty<K, R>()
        }

        const out = empty<K, R>()

        for (const [k, v] of map) {
            out.set(k, f(k, v))
        }

        return out
    }

/**
 * Get the first key for which the given predicate function returns
 * true, wrapped in a `Some`. If no key is found, returns `None`. Uses
 * the given `OrderingComparer` if passed, otherwise defaults to default
 * ASCII-based sort.
 *
 * @group Lookups
 */
export const findKey =
    <K extends NonNullish>(
        predicate: Predicate<NoInfer<K>>,
        orderingComparer?: OrderingComparer<NoInfer<K>>
    ) =>
    <V>(map: ReadonlyMap<K, V>): Option<K> =>
        pipe(
            map,
            keys(orderingComparer),
            _ => _.find(predicate),
            Option.ofNullish
        )

/**
 * Creates a new empty map. Essentially an alias for `new globalThis.Map()`.
 * Provided for convenience to avoid having to use `globalThis`.
 *
 * @group Constructors
 */
export const empty = <K = never, V = never>() => new globalThis.Map<K, V>()

/**
 * Returns `true` if at least one _value_ in the `Map` returns `true`
 * for the given predicate function.
 *
 * @group Lookups
 * @group Utils
 */
export const exists =
    <V>(predicate: Predicate<NoInfer<V>>) =>
    <K>(map: ReadonlyMap<K, V>): boolean => {
        if (map.size < 1) {
            return false
        }

        for (const [, v] of map) {
            if (predicate(v)) {
                return true
            }
        }

        return false
    }

/**
 * Replace the value at a given key in the map using the given
 * replacement function. Will use the given `EqualityComparer`
 * if passed. Otherwise, defaults to reference equality (triple equals).
 *
 * If the key isn't in the map, returns the map unchanged.
 *
 * @group Transformations
 */
export const change =
    <K, V>(
        key: NoInfer<K>,
        f: (v: NoInfer<V>) => NoInfer<V>,
        equalityComparer?: EqualityComparer<NoInfer<K>>
    ) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> =>
        pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.match({
                some: ([k, v]) => {
                    const copy = new globalThis.Map(map)
                    copy.set(k, f(v))
                    return copy
                },
                none: map,
            })
        )

/**
 * Get the number of key/value pairs in the map.
 *
 * @group Utils
 */
export const size = <K, V>(map: ReadonlyMap<K, V>) => map.size

/**
 * Returns whether the map contains any key/value pairs.
 *
 * @group Utils
 *
 * @returns `true` if the map has no bindings, `false` otherwise.
 */
export const isEmpty = <K, V>(map: ReadonlyMap<K, V>) => map.size < 1

/**
 * Get only the keys from the map as an array. Will use the given `OrderingComparer`
 * to sort the keys, otherwise will the default ASCII-based sort.
 *
 * @group Utils
 */
export const keys =
    <K>({ compare }: OrderingComparer<NoInfer<K>> = OrderingComparer.Default) =>
    <V>(map: ReadonlyMap<K, V>): readonly K[] =>
        Array.from(map.keys()).sort(compare)

/**
 * Gets all the values from the map as an array, including duplicates. Values
 * will be sorted using the default ASCII-based sort or the `OrderingComparer`
 * if it is given.
 
 * @group Utils
 */
export const values =
    <V>({ compare }: OrderingComparer<NoInfer<V>> = OrderingComparer.Default) =>
    <K>(map: ReadonlyMap<K, V>): readonly V[] => {
        const values: V[] = []

        for (const [, v] of map) {
            values.push(v)
        }

        return values.sort(compare)
    }

/**
 * Returns the map as an array of key-value tuples. The array will be sorted by
 * key, using the given `OrderingComparer` or falling back to the default ASCII-based
 * sort.
 *
 * @group Transformations
 * @group Utils
 */
export const toArray =
    <K>(orderingComparer?: OrderingComparer<NoInfer<K>>) =>
    <V>(map: ReadonlyMap<K, V>): readonly (readonly [K, V])[] =>
        pipe(map, keys(orderingComparer), _ =>
            _.map(key => [key, map.get(key)!])
        )

/**
 * Also commonly referred to as `fold` or `aggregate`. Applies each key/value
 * pair in the map to a "reducer" (or "folding") function to build up a final
 * accumulated value.
 *
 * Key/value pairs will be given to the reducer function based on the sort-order
 * of the keys. That order can be specified by passing the `OrderingComparer`.
 * Defaults to the standard ASCII-based sort.
 *
 * @group Transformations
 * @group Utils
 *
 * @param f
 * The reducer function. Accepts the accumulator value, the key, and the value and
 * produces the next incremental accumulator value.
 */
export const reduce =
    <S, K, V>(
        init: S,
        f: (acc: S, k: NoInfer<K>, v: NoInfer<V>) => S,
        orderingComparer?: OrderingComparer<NoInfer<K>>
    ) =>
    (map: ReadonlyMap<K, V>): S =>
        pipe(map, toArray(orderingComparer), _ =>
            _.reduce((s, [k, v]) => f(s, k, v), init)
        )

/**
 * Like {@link reduce}, but the key-value pairs are passed to the reducer in
 * _reverse_ sort-order.
 */
export const reduceRight =
    <S, K, V>(
        init: S,
        f: (acc: S, k: NoInfer<K>, v: NoInfer<V>) => S,
        orderingComparer?: OrderingComparer<NoInfer<K>>
    ) =>
    (map: ReadonlyMap<K, V>): S =>
        pipe(map, toArray(orderingComparer), _ =>
            _.reduceRight((s, [k, v]) => f(s, k, v), init)
        )

/**
 * Get a new map containing only the key/value pairs for which the given
 * predicate function returns `true`.
 *
 * @group Transformations
 * @group Filtering
 */
export const filter =
    <K, V>(f: (k: NoInfer<K>, v: NoInfer<V>) => boolean) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> => {
        if (map.size < 1) {
            return empty()
        }

        const out = empty<K, V>()

        for (const [k, v] of map) {
            if (f(k, v)) {
                out.set(k, v)
            }
        }

        return out
    }

/**
 * Test whether every key/value pair in a map returns `true` for the
 * given predicate function.
 *
 * @group Utils
 */
export const every =
    <K, V>(f: (k: NoInfer<K>, v: NoInfer<V>) => boolean) =>
    (map: ReadonlyMap<K, V>): boolean => {
        if (map.size < 1) {
            return true
        }

        for (const [k, v] of map) {
            if (!f(k, v)) {
                return false
            }
        }

        return true
    }

/**
 * Execute an arbitrary side-effect function for every key/value pair in the map.
 * Does not affect the values contained in the map. Can be helpful for logging
 * or debugging.
 *
 * @group Utils
 *
 * @param f Should not mutate its arguments. See {@link map} if you want to
 * transform the map into a new map.
 *
 * @returns void
 */
export const iter =
    <K, V>(f: (k: NoInfer<K>, v: NoInfer<V>) => void) =>
    (map: ReadonlyMap<K, V>): void => {
        if (map.size < 1) {
            return
        }

        for (const [k, v] of map) {
            f(k, v)
        }
    }

/**
 * Convert an array of tuples into a map of key/value pairs.
 *
 * @group Constructors
 */
export const ofArray = <K, V>(
    array: readonly (readonly [K, V])[],
    equalityComparer?: EqualityComparer<K>
): ReadonlyMap<K, V> => {
    if (array.length < 1) {
        return new globalThis.Map()
    }

    return array.reduce<ReadonlyMap<K, V>>(
        (map, kvp) => set(kvp, equalityComparer)(map),
        empty()
    )
}

/**
 * Remove the given key from the map. Will use the `EqualityComparer` if passed,
 * otherwise defaults to reference equality (triple equals). The map will be
 * returned unchanged if the key is not found in the map.
 *
 * @group Transformations
 */
export const remove =
    <K>(key: NoInfer<K>, equalityComparer?: EqualityComparer<NoInfer<K>>) =>
    <V>(map: ReadonlyMap<K, V>) =>
        pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.match({
                some: ([k]) => {
                    const copy = new globalThis.Map(map)
                    copy.delete(k)
                    return copy
                },
                none: map,
            })
        )

/**
 * Convert a `Record` object into a map of key/value pairs. Uses `Object.entries`
 * under-the-hood, so keep in mind there are some gotchas about what comprise
 * an object's "own, enumerable" properties. Designed primarily to be used for
 * simple objects like those deserialized from a JSON blob, for instance.
 *
 * Will use the given `EqualityComparer` to determine key uniqueness if given.
 * Otherwise, defaults to reference equality (triple equals).
 *
 * @group Constructors
 */
export const ofRecord = <K extends string, V>(
    record: Record<K, V>,
    equalityComparer?: EqualityComparer<K>
) =>
    Object.entries<V>(record).reduce<ReadonlyMap<K, V>>(
        (map, [k, v]) => set([k as K, v], equalityComparer)(map),
        empty()
    )
