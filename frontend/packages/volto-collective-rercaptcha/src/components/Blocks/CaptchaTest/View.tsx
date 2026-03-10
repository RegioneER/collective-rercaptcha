import React, { useState } from 'react';
import { RerCapWidget } from '../../index';

/**
 * Interfaccia per i dati salvati nel blocco CaptchaTest.
 */
interface CaptchaTestData {
  /** URL dell'endpoint API configurato tramite la sidebar */
  endpoint?: string;
  /** Altri campi potenziali salvati nel blocco */
  [key: string]: any;
}

/**
 * Props ricevute dal componente View del blocco Volto.
 */
interface CaptchaTestViewProps {
  /** Oggetto contenente la configurazione del blocco */
  data: CaptchaTestData;
  /** Identificativo univoco del blocco nella pagina */
  id?: string;
  /** Indica se il componente è renderizzato all'interno dell'editor */
  isEdit?: boolean;
  /** Proprietà della pagina corrente (metadata) */
  properties?: any;
  /** Percorso corrente della pagina */
  path?: string;
}

/**
 * CaptchaTestView: Componente di visualizzazione del blocco di test.
 * 
 * Utilizza le props tipizzate per gestire la configurazione dell'endpoint
 * e visualizzare il progresso del calcolo PoW.
 */
const View: React.FC<CaptchaTestViewProps> = (props) => {
  const { data } = props;
  const [status, setStatus] = useState<string>('In attesa di avvio...');
  const [token, setToken] = useState<string>('');

  /**
   * Determinazione dell'endpoint:
   * 1. Valore salvato nel blocco (data.endpoint)
   * 2. Fallback su un endpoint di test pubblico se vuoto.
   */
  const endpoint = data?.endpoint || 'https://captcha.gurl.eu.org/api/';

  return (
    <div className="captcha-test-block-view" style={{ padding: '20px', border: '1px solid #ccc', margin: '10px 0', borderRadius: '4px' }}>
      <h4 style={{ marginTop: 0 }}>Test PoW Captcha (Invisibile)</h4>
      <p style={{ fontSize: '0.95em' }}>
        Questo blocco carica un componente <strong>RerCapWidget</strong> che esegue 
        un calcolo Proof of Work (SHA-256) in background tramite WebWorkers.
      </p>
      
      <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>Stato Esecuzione:</strong> <span style={{ color: token ? '#21ba45' : '#4183c4' }}>{status}</span>
        </p>
        {token && (
          <p style={{ margin: 0 }}>
            <strong>Token Ricevuto:</strong> <br />
            <code style={{ 
              display: 'block', 
              padding: '8px', 
              backgroundColor: '#eee', 
              marginTop: '5px', 
              wordBreak: 'break-all',
              fontSize: '0.85em'
            }}>
              {token}
            </code>
          </p>
        )}
      </div>
      
      {/* 
          Integrazione del componente core invisibile.
          Passiamo le callback per aggiornare lo stato locale di questa vista.
      */}
      <RerCapWidget
        endpoint={endpoint}
        onSolve={(t: string) => {
          setStatus('Risolto con successo!');
          setToken(t);
          console.log('RerCapWidget: Token generato e pronto.', t);
        }}
        onError={(err: string) => {
          setStatus('Errore: ' + err);
          console.error('RerCapWidget: Errore durante il test:', err);
        }}
      />
    </div>
  );
};

export default View;
