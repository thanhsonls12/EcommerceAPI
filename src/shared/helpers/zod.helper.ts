import z from 'zod'

/**
 * `z.coerce.date()` / `z.date()` cannot be converted to JSON Schema by zod v4
 * (throws "Date cannot be represented in JSON Schema"), which crashes
 * `SwaggerModule.createDocument`. This override documents them as ISO date-time
 * strings, matching what the API actually accepts over the wire.
 */
export function zDate() {
  const schema = z.coerce.date()
  schema._zod.toJSONSchema = () => ({ type: 'string', format: 'date-time' })
  return schema
}
