import React, { createRef } from 'react';
import {
  GoogleReCaptchaWidget,
  HCaptchaWidget,
  NoRobotsCaptchaWidget,
  HoneypotCaptchaWidget,
} from 'volto-form-block/components/Widget';

import RerCaptchaWidget from 'volto-collective-rercaptcha/components/Widget/FormWidget/RerCaptchaWidget';

class Captcha extends React.Component {
  constructor(props) {
    // TODO: https://reactjs.org/docs/legacy-context.html
    super(props);
    this.captchaRef = createRef();
  }

  reset() {
    const { captcha, captchaToken } = this.props;
    const captchaRef = this.captchaRef;
    if (captcha === 'recaptcha') {
      // TODO?
    } else if (captcha === 'hcaptcha' || captcha === 'hcaptcha_invisible') {
      captchaRef.current && captchaRef.current.resetCaptcha();
      captchaToken.current = null;
    }
  }

  verify() {
    const { captcha, captchaToken } = this.props;
    const captchaRef = this.captchaRef;
    if (captcha === 'recaptcha') {
      return captchaRef.current.verify();
    } else if (captcha === 'hcaptcha' || captcha === 'hcaptcha_invisible') {
      if (!captchaToken.current)
        return captchaRef.current.execute({ async: true });
    }
    return new Promise((resolve) => {
      resolve();
    });
  }

  render() {
    const {
      captchaToken,
      captcha,
      captcha_props,
      onChangeFormData,
      errorMessage,
    } = this.props;

    const RenderErrorMessage = () =>
      errorMessage ? (
        <div className="captcha-error-message">{errorMessage}</div>
      ) : (
        <></>
      );

    const captchaRef = this.captchaRef;
    if (captcha === 'recaptcha') {
      return (
        <>
          <GoogleReCaptchaWidget
            captchaToken={captchaToken}
            sitekey={captcha_props?.public_key}
            captchaRef={captchaRef}
          ></GoogleReCaptchaWidget>
          <RenderErrorMessage />
        </>
      );
    } else if (captcha === 'hcaptcha') {
      return (
        <>
          <HCaptchaWidget
            captchaToken={captchaToken}
            sitekey={captcha_props?.public_key}
            size="normal"
            captchaRef={captchaRef}
          ></HCaptchaWidget>
          <RenderErrorMessage />
        </>
      );
    } else if (captcha === 'hcaptcha_invisible') {
      return (
        <>
          <HCaptchaWidget
            captchaToken={captchaToken}
            sitekey={captcha_props?.public_key}
            size="invisible"
            captchaRef={captchaRef}
          ></HCaptchaWidget>
          <RenderErrorMessage />
        </>
      );
    } else if (captcha === 'norobots-captcha') {
      return (
        <>
          <NoRobotsCaptchaWidget
            id={captcha_props.id}
            id_check={captcha_props.id_check}
            title={captcha_props.title}
            captchaRef={captchaRef}
            captchaToken={captchaToken}
          ></NoRobotsCaptchaWidget>
          <RenderErrorMessage />
        </>
      );
    } else if (captcha === 'honeypot') {
      return (
        <>
          <HoneypotCaptchaWidget
            id={captcha_props.id}
            title={captcha_props.id}
            captchaRef={captchaRef}
            captchaToken={captchaToken}
            onChangeFormData={onChangeFormData}
          />
          <RenderErrorMessage />
        </>
      );
    } else if (captcha === 'rercaptcha') {
      return (
        <>
          <RerCaptchaWidget
            id={'capjs-token'}
            captchaToken={captchaToken}
            captchaRef={captchaRef}
            onChangeFormData={onChangeFormData}
            errorMessage={errorMessage}
          ></RerCaptchaWidget>
          {/* RenderErrorMessage is usually handled inside RerCaptchaWidget for PoW, 
              but we keep the standard behavior of the block form here as well 
             */}
          <RenderErrorMessage />
        </>
      );
    } else {
      return null;
    }
  }
}

export default Captcha;
