import { useId } from 'react';
import './ClothingAttributes.css';

export default function ClothingAttributes({ values, onChange }) {
  const conditionOptionsId = useId();
  return (
    <fieldset className="clothing-attributes">
      <legend>Atributos da peça (opcionais)</legend>
      {[
        ['category', 'Categoria', 'Ex.: calça, blusa'],
        ['size', 'Tamanho', 'Ex.: RN, 4, P'],
        ['condition', 'Condição', 'Ex.: Nova, Seminova, Usada'],
        ['style', 'Estilo', 'Ex.: casual, festa'],
      ].map(([name, label, placeholder]) => (
        <label key={name}>
          <span>{label}</span>
          <input
            type="text"
            name={name}
            value={values[name] ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            list={name === 'condition' ? conditionOptionsId : undefined}
          />
        </label>
      ))}
      <datalist id={conditionOptionsId}>
        <option value="Nova" />
        <option value="Seminova" />
        <option value="Usada" />
      </datalist>
    </fieldset>
  );
}
