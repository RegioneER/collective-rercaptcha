/* CUSTOMIZATIONS:
  file originale: @redturtle/volto-newsletter v1.2.7 (src/views/Channel.jsx)

  - aggiunta del rercaptcha di collective-rercaptcha ai form di iscrizione e
    cancellazione della newsletter. Il token viene inviato nel body della POST
    come 'capjs-token' (validato lato backend dal pre_traverse_check di
    collective.rercaptcha, se la route è tra le whitelisted_routes).
  - il calcolo del captcha parte al click sul bottone di invio di ciascun
    form (iscrizione/cancellazione), non al caricamento della pagina:
    RerCaptchaWidget riceve una captchaRef dedicata per form, invocata da
    sendSubscribeForm/sendUnsubscribeForm al momento giusto
  - dopo un submit fallito il widget viene rimontato (cambio di key) per
    rigenerare un token fresco: i token cap.js sono monouso
  - il campo email viene controllato prima di avviare il calcolo captcha
    (un campo vuoto non deve far partire il calcolo, il file originale non
    aveva nessuna validazione client-side, solo quella del backend)
  - RerCaptchaWidget si renderizza dopo il bottone di invio (a destra),
    non più prima
  - in modalità bottone esplicito (flag `show-button`) il bottone di invio
    resta disabilitato finché la verifica non è completata; in modalità
    invisibile (default) resta sempre cliccabile, come richiesto dal punto
    sopra sul calcolo al click
*/
import React, { useState, createRef, useEffect, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { Form, Input, Button } from 'design-react-kit';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
// eslint-disable-next-line import/no-unresolved
import { Icon } from 'design-comuni-plone-theme/components/ItaliaTheme';
import {
  SideMenu,
  PageHeader,
  RichTextSection,
  SkipToMainContent,
  // eslint-disable-next-line import/no-unresolved
} from 'design-comuni-plone-theme/components/ItaliaTheme/View';
import {
  subscribeNewsletter,
  resetSubscribeNewsletter,
  unsubscribeNewsletter,
  resetUnsubscribeNewsletter,
  // eslint-disable-next-line import/no-unresolved
} from '@redturtle/volto-newsletter/actions';
// eslint-disable-next-line import/no-unresolved
import HoneypotWidget from '@redturtle/volto-newsletter/views/HoneypotWidget/HoneypotWidget';
// eslint-disable-next-line import/no-unresolved
import RerCaptchaWidget from '@regioneer/volto-collective-rercaptcha/components/Widget/FormWidget/RerCaptchaWidget';

const messages = defineMessages({
  invalid_email: {
    id: 'newsletter_invalid_email',
    defaultMessage: 'Inserisci un indirizzo email valido',
  },
  subscribe: {
    id: 'Subscribe',
    defaultMessage: 'Iscriviti',
  },
  unsubscribe: {
    id: 'Unsubscribe',
    defaultMessage: 'Cancella iscrizione',
  },
  subscribeNewsletterHeader: {
    id: 'subscribeNewsletterHeader',
    defaultMessage: 'Iscriviti per ricevere la newsletter',
  },
  subscribeNewsletterLabel: {
    id: 'subscribeNewsletterLabel',
    defaultMessage:
      'Inserisci il tuo indirizzo email per iscriverti alla newsletter',
  },
  newsletterPrivacyStatement: {
    id: 'newsletterPrivacyStatement',
    defaultMessage: 'Informativa sulla privacy',
  },
  unsubscribeNewsletterHeader: {
    id: 'unsubscribeNewsletterHeader',
    defaultMessage: 'Rimuovi la tua iscrizione alla newsletter',
  },
  unsubscribeNewsletterLabel: {
    id: 'unsubscribeNewsletterLabel',
    defaultMessage:
      'Inserisci il tuo indirizzo email per cancellarti dalla newsletter',
  },
  newsletterSubscriptionThankyou: {
    id: 'newsletterSubscriptionThankyou',
    defaultMessage:
      "Grazie per esserti iscritto alla newsletter. Controlla la tua casella di posta elettronica per confermare l'iscrizione.",
  },
  newsletterUnsubscriptionConfirmation: {
    id: 'newsletterUnsubscriptionConfirmation',
    defaultMessage:
      "La tua richiesta di cancellazione dell'iscrizione alla newsletter è stata inviata. Controlla la tua casella di posta elettronica per confermare la cancellazione.",
  },
  newsletterSubscriptionError: {
    id: 'newsletterSubscriptionError',
    defaultMessage:
      "Si è verificato un errore durante l'invio della richiesta. Si prega di riprovare più tardi.",
  },
  user_subscribe_success: {
    id: 'user_subscribe_success',
    defaultMessage:
      "Richiesta di iscrizione inviata. Controlla la tua casella di posta elettronica per confermare l'iscrizione.",
  },
  invalid_captcha: {
    id: 'invalid_captcha',
    defaultMessage: 'Captcha non valido',
  },
  message_wrong_captcha: {
    id: 'message_wrong_captcha',
    defaultMessage: 'Captcha non valido',
  },
  user_already_subscribed: {
    id: 'user_already_subscribed',
    defaultMessage: "L'indirizzo email è già iscritto alla newsletter",
  },
  user_unsubscribe_success: {
    id: 'user_unsubscribe_success',
    defaultMessage:
      'Richiesta di cancellazione inviata. Controlla la tua casella di posta elettronica per confermare la cancellazione.',
  },
  unsubscribe_generic: {
    id: 'unsubscribe_generic',
    defaultMessage:
      'Errore durante la richiesta. Si prega di riprovare più tardi.',
  },
});

const Channel = ({ content, location }) => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const {
    loading: subscribeLoading,
    loaded: subscribeLoaded,
    error: subscribeError,
  } = useSelector((state) => state.subscribeNewsletter);
  const {
    loading: unsubscribeLoading,
    loaded: unsubscribeLoaded,
    error: unsubscribeError,
  } = useSelector((state) => state.unsubscribeNewsletter);

  /* CUSTOMIZATIONS: se l'expander rercaptcha-data è presente, il captcha è
     attivo lato backend e i form lo richiedono */
  const rerCaptchaData =
    useSelector(
      (state) => state.content?.data?.['@components']?.['rercaptcha-data'],
    ) || null;
  const rerCaptchaEnabled = !!rerCaptchaData;
  // Modalità bottone esplicito: in questo caso, a differenza di quella
  // invisibile, il submit va tenuto bloccato finché la verifica non è
  // completata (altrimenti si può inviare senza aver mai cliccato il
  // bottone di verifica).
  const rercaptchaShowsOwnButton = !!rerCaptchaData?.['show-button'];

  const [email, setEmail] = useState('');
  const [unsubEmail, setUnsubEmail] = useState('');
  const [subHoney, setSubHoney] = useState('');
  const [unsubHoney, setUnsubHoney] = useState('');

  // Una captchaRef per form, per invocare execute() al submit. I token
  // vengono tenuti anche in stato locale (oltre che nella ref) solo per
  // poter disabilitare il bottone di invio in modalità bottone esplicito.
  const subCaptchaRef = useRef();
  const unsubCaptchaRef = useRef();
  const [subRerCaptchaToken, setSubRerCaptchaToken] = useState('');
  const [unsubRerCaptchaToken, setUnsubRerCaptchaToken] = useState('');
  const [subRerCaptchaAttempt, setSubRerCaptchaAttempt] = useState(0);
  const [unsubRerCaptchaAttempt, setUnsubRerCaptchaAttempt] = useState(0);

  const [sideMenuElements, setSideMenuElements] = useState(null);
  let documentBody = createRef();
  const path = location.pathname ?? '/';

  let fieldHoney = process.env.RAZZLE_HONEYPOT_FIELD;
  if (__CLIENT__) {
    fieldHoney = window.env.RAZZLE_HONEYPOT_FIELD;
  }

  const sendSubscribeForm = async () => {
    // Campo email prima, captcha dopo: un'email mancante non deve far
    // partire il calcolo captcha.
    if (!email) {
      toast.error(intl.formatMessage(messages.invalid_email));
      return;
    }

    // Usiamo il valore risolto dalla Promise, non uno stato locale: evita
    // di leggere una versione non ancora aggiornata per via della chiusura
    // di questa funzione.
    const rerCaptchaToken = await subCaptchaRef.current?.execute({
      async: true,
    });
    dispatch(
      subscribeNewsletter(path, {
        email,
        ...(fieldHoney && { [fieldHoney]: subHoney }),
        ...(rerCaptchaEnabled && { 'capjs-token': rerCaptchaToken }),
      }),
    );
  };

  const sendUnsubscribeForm = async () => {
    if (!unsubEmail) {
      toast.error(intl.formatMessage(messages.invalid_email));
      return;
    }

    const rerCaptchaToken = await unsubCaptchaRef.current?.execute({
      async: true,
    });
    dispatch(
      unsubscribeNewsletter(path, {
        email: unsubEmail,
        ...(fieldHoney && { [fieldHoney]: unsubHoney }),
        ...(rerCaptchaEnabled && { 'capjs-token': rerCaptchaToken }),
      }),
    );
  };

  let action = path?.length > 1 ? path.replace(/\//g, '') : path;
  if (action?.length > 0) {
    action = action?.replace(/-/g, '_');
  } else {
    action = 'homepage';
  }

  // Populate side menu
  useEffect(() => {
    if (documentBody.current) {
      if (__CLIENT__) {
        setSideMenuElements(documentBody.current);
      }
    }
  }, [documentBody]);

  // Subscribe success
  useEffect(() => {
    if (subscribeLoaded && !subscribeError) {
      setEmail('');
      setSubHoney('');
      toast.success(intl.formatMessage(messages.user_subscribe_success));
      return () => {
        dispatch(resetSubscribeNewsletter());
      };
    }
  }, [dispatch, intl, subscribeLoaded, subscribeError]);

  // Unsubscribe success
  useEffect(() => {
    if (unsubscribeLoaded && !unsubscribeError) {
      setUnsubEmail('');
      setUnsubHoney('');
      toast.success(intl.formatMessage(messages.user_unsubscribe_success));
      return () => {
        dispatch(resetUnsubscribeNewsletter());
      };
    }
  }, [dispatch, intl, unsubscribeLoaded, unsubscribeError]);

  // Subscribe generic error
  // TODO TEST
  useEffect(() => {
    if (subscribeError) {
      const message =
        subscribeError?.response?.body?.message ||
        intl.formatMessage(messages.newsletterSubscriptionError);
      toast.error(message);
      /* CUSTOMIZATIONS: il token è monouso, rimontiamo il widget per
         ricalcolarne uno nuovo in vista di un nuovo tentativo */
      setSubRerCaptchaAttempt((attempt) => attempt + 1);
    }
  }, [subscribeError, intl]);

  // Unsubscribe generic error
  // TODO TEST
  useEffect(() => {
    if (unsubscribeError) {
      const message =
        unsubscribeError?.response?.body?.message ||
        intl.formatMessage(messages.newsletterSubscriptionError);
      toast.error(message);
      /* CUSTOMIZATIONS: il token è monouso, rimontiamo il widget per
         ricalcolarne uno nuovo in vista di un nuovo tentativo */
      setUnsubRerCaptchaAttempt((attempt) => attempt + 1);
    }
  }, [unsubscribeError, intl]);

  return (
    <>
      <div className="container px-4 my-4 channel-view">
        <SkipToMainContent />
        <PageHeader
          content={content}
          readingtime={null}
          showreadingtime={false}
          showdates={false}
          showtassonomiaargomenti={false}
        />

        <div className="row border-top row-column-border row-column-menu-left">
          <aside className="col-lg-4">
            {__CLIENT__ && (
              <SideMenu data={sideMenuElements} content_uid={content?.UID} />
            )}
          </aside>
          <section
            ref={documentBody}
            id="main-content-section"
            className="col-lg-8 it-page-sections-container"
          >
            {content.is_subscribable && (
              <section id="subscribe-form" className="it-page-section mb-5">
                <h2 id="header-subscribe-form" className="mb-3 h4">
                  {intl.formatMessage(messages.subscribeNewsletterHeader)}
                </h2>
                {subscribeLoaded && !subscribeError && (
                  <p>
                    {intl.formatMessage(
                      messages.newsletterSubscriptionThankyou,
                    )}
                  </p>
                )}

                <Form
                  action={`${path}/@subscribe-newsletter`}
                  className="form-newsletter"
                  method="post"
                  tag="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!(subscribeLoaded && !subscribeError)) {
                      sendSubscribeForm();
                    }
                  }}
                >
                  {!(subscribeLoaded && !subscribeError) && (
                    <>
                      <Input
                        type="email"
                        id="subscribe-input-newsletter"
                        name="subscribe-input-newsletter"
                        placeholder="mail@example.com"
                        className="mb-3"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                        }}
                        label={intl.formatMessage(
                          messages.subscribeNewsletterLabel,
                        )}
                      />
                      {fieldHoney && (
                        <HoneypotWidget
                          updateFormData={(_, value) => {
                            setSubHoney(value);
                          }}
                          field={fieldHoney}
                        />
                      )}
                      <Button
                        color="primary"
                        className="btn-icon"
                        type="submit"
                        tag="button"
                        icon={false}
                        disabled={
                          subscribeLoading ||
                          (rercaptchaShowsOwnButton && !subRerCaptchaToken)
                        }
                      >
                        <Icon
                          icon="it-mail"
                          color="white"
                          padding={false}
                          size=""
                        />
                        <span>{intl.formatMessage(messages.subscribe)}</span>
                      </Button>
                      {/* CUSTOMIZATIONS: render rercaptcha, a destra del
                          bottone di invio */}
                      <RerCaptchaWidget
                        key={`subscribe-rercaptcha-${subRerCaptchaAttempt}`}
                        id={'capjs-token'}
                        captchaRef={subCaptchaRef}
                        onChangeFormData={(id, label, value) => {
                          setSubRerCaptchaToken(value);
                        }}
                      />
                    </>
                  )}
                </Form>
              </section>
            )}
            <RichTextSection
              tag_id={'text-body'}
              title={intl.formatMessage(messages.newsletterPrivacyStatement)}
              show_title={false}
              data={content.privacy}
            ></RichTextSection>
            <section id="unsubscribe-form" className="it-page-section mb-5">
              <h2 id="header-unsubscribe-form" className="mb-3 h4">
                {intl.formatMessage(messages.unsubscribeNewsletterHeader)}
              </h2>
              {unsubscribeLoaded && !unsubscribeError && (
                <p>
                  {intl.formatMessage(
                    messages.newsletterUnsubscriptionConfirmation,
                  )}
                </p>
              )}
              <Form
                action={`${path}/@unsubscribe-newsletter`}
                className="form-newsletter"
                method="post"
                tag="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!(unsubscribeLoaded && !unsubscribeError)) {
                    sendUnsubscribeForm();
                  }
                }}
              >
                {!(unsubscribeLoaded && !unsubscribeError) && (
                  <>
                    <Input
                      type="email"
                      id="unsubscribe-input-newsletter"
                      name="unsubscribe-input-newsletter"
                      placeholder="mail@example.com"
                      className="mb-3"
                      value={unsubEmail}
                      onChange={(e) => {
                        setUnsubEmail(e.target.value);
                      }}
                      label={intl.formatMessage(
                        messages.unsubscribeNewsletterLabel,
                      )}
                    />
                    {fieldHoney && (
                      <HoneypotWidget
                        updateFormData={(_, value) => {
                          setUnsubHoney(value);
                        }}
                        field={fieldHoney}
                      />
                    )}
                    <Button
                      color="primary"
                      className="btn-icon"
                      type="submit"
                      tag="button"
                      icon={false}
                      disabled={
                        unsubscribeLoading ||
                        (rercaptchaShowsOwnButton && !unsubRerCaptchaToken)
                      }
                    >
                      <Icon
                        icon="it-mail"
                        color="white"
                        padding={false}
                        size=""
                      />
                      <span>{intl.formatMessage(messages.unsubscribe)}</span>
                    </Button>
                    {/* CUSTOMIZATIONS: render rercaptcha, a destra del
                        bottone di invio */}
                    <RerCaptchaWidget
                      key={`unsubscribe-rercaptcha-${unsubRerCaptchaAttempt}`}
                      id={'capjs-token'}
                      captchaRef={unsubCaptchaRef}
                      onChangeFormData={(id, label, value) => {
                        setUnsubRerCaptchaToken(value);
                      }}
                    />
                  </>
                )}
              </Form>
            </section>
          </section>
        </div>
      </div>
    </>
  );
};

export default Channel;
