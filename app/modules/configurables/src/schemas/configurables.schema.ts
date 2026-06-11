/* START: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */
export interface FieldSchemaType {
  fieldName?: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "color"
    | "url"
    | "enum"
    | "datetime"
    | "file"
    | "files";
  required?: boolean;
  label?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  fields?: FieldSchemaType[];
  item?: FieldSchemaType;
}
/* END: THIS SECTION CODE IS CANNOT BE CHANGED, YOU ONLY READ IT */

export type ConfigurableSchemas = {
  formSchema: FieldSchemaType[];
};



export const configurableSchemas: ConfigurableSchemas = {
  formSchema: [
    {
      fieldName: "appName",
      type: "string",
      required: true,
      label: "App Name",
    },
    {
      fieldName: "logoUrl",
      type: "url",
      required: false,
      label: "Logo URL",
    },
    {
      fieldName: "brandColor",
      type: "object",
      required: true,
      label: "Brand Color",
      fields: [
        {
          fieldName: "primary",
          type: "color",
          required: true,
          label: "Primary",
        },
        {
          fieldName: "secondary",
          type: "color",
          required: true,
          label: "Secondary",
        },
        {
          fieldName: "accent",
          type: "color",
          required: true,
          label: "Accent",
        },
      ],
    },
    {
      fieldName: "heroTagline",
      type: "string",
      required: false,
      label: "Hero Tagline",
      maxLength: 120,
    },
    {
      fieldName: "heroSubtext",
      type: "string",
      required: false,
      label: "Hero Subtext",
      maxLength: 200,
    },
    {
      fieldName: "ctaLabel",
      type: "string",
      required: false,
      label: "CTA Button Label",
      maxLength: 40,
    },
    {
      fieldName: "ctaHref",
      type: "string",
      required: false,
      label: "CTA Button Link (URL or mailto)",
      maxLength: 200,
    },
    {
      fieldName: "heroImage",
      type: "file",
      required: false,
      label: "Hero Background Image",
    },
    {
      fieldName: "footerLine",
      type: "string",
      required: false,
      label: "Footer Contact / Social Line",
      maxLength: 160,
    },
  ],
};
