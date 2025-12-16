// default values for rule fields
// used for creation and for resetting

import { getColumnSchema } from "./util/models"

const sampleRequest = {
  alpha: 0,
  beta: "a",
  charlie: true
}
const requestSchema = getColumnSchema(sampleRequest)

const sampleResponse = {
  status: "success",
  error: false
}
const responseSchema = getColumnSchema(sampleResponse)

const conditions = [
  {
    request: {},
    response: { status: { value: "success" }, error: { value: false } }
  }
]

export default {
  sampleRequest,
  sampleResponse,
  requestSchema,
  responseSchema,
  conditions
}
