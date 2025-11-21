export default function normalizeMetaobject(meta) {
  return meta.fields.reduce((acc, field) => {
    acc[field.key] = {
      value: field.value,
      reference: field.reference,
      references: field.references,
    };
    return acc;
  }, {});
}
