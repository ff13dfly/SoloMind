import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { EntityDefinition } from '../../providers/ServicesProvider';

interface EntityFormProps {
  entityDef: EntityDefinition;
  formData: any;
  onChange: (data: any) => void;
  onSubmit: (data: any) => void;
  disabled?: boolean;
}

export function EntityForm({ entityDef, formData, onChange, onSubmit, disabled }: EntityFormProps) {
  // Convert EntityDefinition to JSON Schema
  const schema: RJSFSchema = {
    type: 'object',
    required: Object.entries(entityDef.fields)
      .filter(([name, f]) => name.toLowerCase() !== 'id' && f.required)
      .map(([name]) => name),
    properties: Object.entries(entityDef.fields)
      .filter(([name]) => name.toLowerCase() !== 'id')
      .reduce((acc, [name, f]) => {
        let type = 'string';
        if (f.type === 'number') type = 'number';
        if (f.type === 'boolean') type = 'boolean';
        if (f.type === 'array') type = 'array';
        if (f.type === 'object') type = 'object';

        acc[name] = {
          type,
          title: name.toUpperCase(),
          description: f.description,
        };

        if (f.type === 'datetime') {
          acc[name].format = 'date-time';
        }

        return acc;
      }, {} as any),
  };

  const uiSchema: UiSchema = {
    "ui:submitButtonOptions": {
      norender: true,
    },
    // Ensure all fields have a consistent class
    "ui:globalOptions": {
      "copyable": true
    },
    "ui:options": {
      "label": true
    }
  };

  return (
    <div className="entity-form-container">
      <style>{`
        .entity-form-container form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        /* Force each field into a single horizontal row */
        .entity-form-container .field-object > div > .form-group {
          width: 100%;
          display: block;
          clear: both;
        }
        .entity-form-container .form-group {
          margin-bottom: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .entity-form-container label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 2px;
        }
        .entity-form-container .field-description {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .entity-form-container input, 
        .entity-form-container textarea, 
        .entity-form-container select {
          width: 100% !important;
          padding: 12px 16px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          color: #1e293b !important;
          background-color: #f8fafc !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box !important;
          display: block !important;
        }
        .entity-form-container input:focus,
        .entity-form-container textarea:focus,
        .entity-form-container select:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          background-color: #fff !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
        }
        .entity-form-container .checkbox {
          padding: 12px 16px;
          background: #f1f5f9;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .entity-form-container .checkbox label {
          display: flex;
          flex-direction: row-reverse;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          text-transform: none;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0;
          cursor: pointer;
        }
        .entity-form-container .checkbox input {
          width: 20px !important;
          height: 20px !important;
          margin: 0 !important;
          cursor: pointer;
        }
        /* Hide default RJSF legend for objects */
        .entity-form-container fieldset {
          border: none;
          padding: 0;
          margin: 0;
          width: 100%;
        }
        .entity-form-container legend {
          display: none;
        }
        /* Error states */
        .entity-form-container .has-error input {
          border-color: #ef4444 !important;
          background-color: #fef2f2 !important;
        }
        .entity-form-container .error-detail {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
          list-style: none;
          padding: 0;
        }
      `}</style>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        formData={formData}
        onChange={(e) => onChange(e.formData)}
        onSubmit={(e) => onSubmit(e.formData)}
        disabled={disabled}
      />
    </div>
  );
}
