import process from 'node:process'
import type { DefineComponent, Slot } from 'vue'
import { defineComponent, shallowRef } from 'vue'
import { camelize, makeDestructurable } from './utils'

export type DefineTemplateComponent<
    Bindings extends object,
    Slots extends Record<string, Slot | undefined>,
> = DefineComponent<object> & {
    new (): { $slots: { default(_: Bindings & { $slots: Slots }): any } }
}

export type ReuseTemplateComponent<
    Bindings extends object,
    Slots extends Record<string, Slot | undefined>,
> = DefineComponent<Bindings> & {
    new (): { $slots: Slots }
}

export type ReusableTemplatePair<
    Bindings extends object,
    Slots extends Record<string, Slot | undefined>,
> = [
    DefineTemplateComponent<Bindings, Slots>,
    ReuseTemplateComponent<Bindings, Slots>,
] & {
    define: DefineTemplateComponent<Bindings, Slots>
    reuse: ReuseTemplateComponent<Bindings, Slots>
}

export interface CreateReusableTemplateOptions {
    /**
     * Inherit attrs from reuse component.
     *
     * @default true
     */
    inheritAttrs?: boolean
}

/**
 * This function creates `define` and `reuse` components in pair,
 * It also allow to pass a generic to bind with type.
 *
 * @see https://vueuse.org/createReusableTemplate
 */
export function createReusableTemplate<
    Bindings extends object,
    Slots extends Record<string, Slot | undefined> = Record<string, Slot | undefined>,
>(
    options: CreateReusableTemplateOptions = {},
): ReusableTemplatePair<Bindings, Slots> {
    const { inheritAttrs = true } = options

    const render = shallowRef<Slot | undefined>()

    const define = defineComponent({
        setup(_, { slots }) {
            return () => {
                render.value = slots.default
            }
        },
    }) as DefineTemplateComponent<Bindings, Slots>

    const reuse = defineComponent({
        inheritAttrs,
        setup(_, { attrs, slots }) {
            return () => {
                if (!render.value && process.env.NODE_ENV !== 'production') {
                    throw new Error(
                        '[VueUse] Failed to find the definition of reusable template',
                    )
                }
                const vnode = render.value?.({
                    ...keysToCamelKebabCase(attrs),
                    $slots: slots,
                })
                return inheritAttrs && vnode?.length === 1 ? vnode[0] : vnode
            }
        },
    }) as ReuseTemplateComponent<Bindings, Slots>

    return makeDestructurable({ define, reuse }, [define, reuse]) as any
}

function keysToCamelKebabCase(obj: Record<string, any>) {
    const newObj: typeof obj = {}
    for (const key in obj) newObj[camelize(key)] = obj[key]
    return newObj
}
