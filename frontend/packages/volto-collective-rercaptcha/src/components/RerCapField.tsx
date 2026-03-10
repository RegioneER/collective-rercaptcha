import React from 'react';
import { useSelector } from 'react-redux';
import RerCapWidget from './RerCapWidget';

/**
 * Props per il widget RerCapField di Volto.
 */
interface RerCapFieldProps {
  /** ID univoco del campo nel form */
  id: string;
  /** Valore corrente del campo (il token generato) */
  value?: string;
  /** Funzione per aggiornare il valore nel form */
  onChange: (id: string, value: string) => void;
  /** Endpoint sovrascritto opzionale (passato dal blocco form) */
  endpoint?: string;
  /** Numero di worker opzionale */
  workerCount?: number;
  /** Titolo del campo (usato solitamente in edit) */
  title?: string;
  /** Callback opzionale per monitorare il progresso del calcolo (0-100) */
  onProgress?: (progress: number) => void;
  /** Callback opzionale invocata quando il captcha viene resettato */
  onReset?: () => void;
}

/**
 * RerCapField: Un widget per i form di Volto che integra il captcha invisibile.
 */
const RerCapField: React.FC<RerCapFieldProps> = (props) => {
  const { id, value, onChange, endpoint, workerCount, title, onProgress, onReset } = props;

  // Recuperiamo le impostazioni globali dallo store di Volto
  const settings = useSelector((state: any) => state.settings?.rercaptcha || {});
  
  const apiEndpoint = endpoint || settings.endpoint || 'https://captcha.gurl.eu.org/api/';

  return (
    <div className="rercap-field-wrapper" style={{ display: 'none' }}>
      <input
        type="hidden"
        id={id}
        name={id}
        value={value || ''}
        readOnly
      />
      
      {apiEndpoint && (
        <RerCapWidget
          endpoint={apiEndpoint}
          workerCount={workerCount || settings.workerCount}
          onSolve={(token: string) => {
            onChange(id, token);
          }}
          onError={(err: string) => {
            console.error(`Errore nel campo captcha [${id}]:`, err);
            onChange(id, '');
          }}
          onProgress={onProgress}
          onReset={onReset}
        />
      )}
      
      {process.env.NODE_ENV === 'development' && (
        <div style={{ display: 'none' }} data-field-title={title}>
          Captcha PoW Field
        </div>
      )}
    </div>
  );
};

export default RerCapField;
