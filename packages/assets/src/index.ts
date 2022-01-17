export type {
  IAttributeNumeric,
  IAttributeString,
  IMetadata,
  IMetadataAttribute,
} from "./types.js";
import adultMetadata from "./metadata/all_metadata_cids.json";
import babyMetadata from "./metadata/all_metadata_baby_cids.json";
export { default as assetPath } from "./path.js";
export { adultMetadata, babyMetadata };
