import axios from "axios";
import * as semver from "compare-versions";
import currency from "currency.js";
import { flatten } from "flat";
import * as h3 from "h3-js";
import _ from "lodash";
import moment from "moment";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";

export default {
  moment,
  flatten,
  h3,
  _,
  nanoid,
  uuidv4,
  currency,
  axios,
  fetch,
  semver
};

