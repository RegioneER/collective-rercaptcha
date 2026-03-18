import React from 'react';
import { SidebarPortal } from '@plone/volto/components';
import View from './View';

/**
 * Props per il componente Edit del blocco CaptchaTestBlock.
 */
interface CaptchaTestEditProps {
  /** Stato interno del blocco in Volto */
  data: {
    endpoint?: string;
    [key: string]: any;
  };
  /** Funzione per salvare le modifiche al blocco */
  onChangeBlock: (blockId: string, newData: any) => void;
  /** Identificativo univoco del blocco nella pagina */
  block: string;
  /** Indica se il blocco è attualmente selezionato dall'utente */
  selected: boolean;
  /** Proprietà extra di Volto */
  [key: string]: any;
}

/**
 * CaptchaTestEdit: Configurazione laterale (sidebar) del blocco di test.
 *
 * SCELTE TECNICHE:
 * - Uso di SidebarPortal per inserire la configurazione nella barra laterale di Volto.
 * - Sostituzione di Semantic UI con classi standard Volto (field, segment, group)
 *   per evitare problemi di tipizzazione JSX complessi.
 */
const Edit: React.FC<CaptchaTestEditProps> = (props) => {
  const { data, onChangeBlock, block, selected } = props;

  /** Gestisce il cambiamento dell'endpoint nella sidebar */
  const handleEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChangeBlock(block, {
      ...data,
      [name]: value,
    });
  };

  return (
    <>
      {/* Visualizza l'anteprima del blocco nell'editor centrale */}
      <View {...props} isEdit={true} />

      {/* Pannello laterale per la configurazione dell'endpoint */}
      <SidebarPortal selected={selected}>
        <div className="ui segment-group" style={{ padding: '10px' }}>
          <div className="ui segment">
            <h4>Configurazione Test Captcha PoW</h4>
            <div className="field">
              <label htmlFor="endpoint">URL Endpoint API Captcha</label>
              <input
                id="endpoint"
                name="endpoint"
                type="text"
                className="ui input"
                value={data.endpoint || ''}
                placeholder="https://captcha.gurl.eu.org/api/"
                onChange={handleEndpointChange}
              />
              <p
                className="help-text"
                style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}
              >
                Inserisci l'URL dell'API del servizio captcha che genera la
                sfida SHA-256.
              </p>
            </div>
          </div>
        </div>
      </SidebarPortal>
    </>
  );
};

export default Edit;
