# collective-rercaptcha (@regioneer/volto-collective-rercaptcha)

Volto add-on that protects public forms from spam with a privacy-friendly, proof-of-work captcha based on [Cap](https://capjs.js.org/).

[![npm](https://img.shields.io/npm/v/@regioneer/volto-collective-rercaptcha)](https://www.npmjs.com/package/@regioneer/volto-collective-rercaptcha)
[![CI](https://github.com/RegioneER/collective-rercaptcha/actions/workflows/main.yml/badge.svg)](https://github.com/RegioneER/collective-rercaptcha/actions/workflows/main.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

This is the frontend part of [collective-rercaptcha](https://github.com/RegioneER/collective-rercaptcha).
It works together with the Plone add-on [`collective.rercaptcha`](https://github.com/RegioneER/collective-rercaptcha/tree/main/backend), which holds the configuration and verifies the tokens on the server.

## Features

- **No images or puzzles to solve.** The browser proves it is not a bot by solving a small SHA-256 proof-of-work in Web Workers, using [`@cap.js/widget`](https://www.npmjs.com/package/@cap.js/widget). No third-party tracking service is involved: the browser talks only to your own Cap server.
- **Two modes**, chosen by the site administrator in the Plone control panel:
  - **Invisible** (default): nothing is shown to the user. The proof-of-work starts when the form is submitted, and a "please wait" message appears only if it takes longer than a moment.
  - **Button**: the user clicks an "I'm not a robot" checkbox before submitting. The checkbox shows when the verification succeeds or fails, and lets the user retry.
- **Ready-made integrations** with common Plone/Volto add-ons:
  - [`volto-form-block`](https://www.npmjs.com/package/volto-form-block): adds `rercaptcha` as a captcha provider for form blocks.
  - [`design-comuni-plone-theme`](https://github.com/RedTurtle/design-comuni-plone-theme): protects the Customer Satisfaction feedback form.
  - [`@redturtle/volto-newsletter`](https://www.npmjs.com/package/@redturtle/volto-newsletter): protects the subscribe and unsubscribe forms of newsletter channels.
- **Reusable components and hooks** to add the captcha to your own forms.
- **Per-route activation**: the captcha is required only on the endpoints listed in the backend configuration.

## Requirements

| Component | Version |
| --- | --- |
| Volto | 18 |
| React | 17 or 18 |
| Node.js | 22 |
| Plone backend | 6.1, with [`collective.rercaptcha`](https://github.com/RegioneER/collective-rercaptcha/tree/main/backend) installed |
| Cap server | a running [Cap standalone server](https://capjs.js.org/guide/standalone.html), reachable from the users' browsers |

Peer dependencies: `volto-form-block` 3.17.1, `volto-feedback` 0.7.2, `design-react-kit` 5.0.0-1, `reactstrap` 9 and `react-toastify` 5.

## Installation

### 1. Backend

Install the `collective.rercaptcha` Python package in your Plone backend and activate it in the add-ons control panel (or import the `collective.rercaptcha:default` profile).

To use the captcha with `volto-form-block`, the backend also needs [`collective.volto.formsupport`](https://pypi.org/project/collective.volto.formsupport/).

### 2. Frontend

Add the package to the dependencies of your Volto project:

```shell
pnpm add @regioneer/volto-collective-rercaptcha
```

Then add it to the add-ons in your `volto.config.js`.
List it **after** the add-ons it customizes, such as `volto-form-block`:

```javascript
const addons = [
  'volto-form-block',
  // ...
  '@regioneer/volto-collective-rercaptcha',
];
```

## Configuration

All the settings live in the backend, in the **RerCaptcha** control panel of Plone:

| Setting | Description |
| --- | --- |
| Use captcha | Enables the captcha on the site |
| Show button | Uses the button mode instead of the invisible one |
| Captcha URI | Base URL of your Cap server |
| Site key | Site key of the Cap server |
| Secret | Secret key, used only by the backend to verify the tokens |
| Whitelisted routes | The endpoints that require a valid captcha, for example `@submit-form`, `@feedback-add`, `@subscribe-newsletter`, `@unsubscribe-newsletter` |

The frontend reads the public part of this configuration from the `rercaptcha-data` component of the content response (`@components`).

When the captcha is enabled and configured, the backend rejects any `POST` to a whitelisted route without a valid token (`400` if the token is missing, `403` if it is not valid).
Otherwise it does not check any request.

### With volto-form-block

Once the add-on is installed and configured, choose **rercaptcha** as the captcha of a form block in the block settings, and add `@submit-form` to the whitelisted routes.

## Using the captcha in your own forms

Render `RerCaptchaWidget` in your form and pass it a ref.
When the form is submitted, validate the other fields first, then ask the widget for a token and send it in the request body as `capjs-token`:

```jsx
import { useRef } from 'react';
import RerCaptchaWidget from '@regioneer/volto-collective-rercaptcha/components/Widget/FormWidget/RerCaptchaWidget';

const MyForm = () => {
  const captchaRef = useRef();

  const handleSubmit = async () => {
    if (isInvalid()) return; // validate the other fields first

    const token = await captchaRef.current?.execute({ async: true });

    dispatch(submitSomething({ ...formData, 'capjs-token': token }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* other fields */}
      <RerCaptchaWidget
        id="capjs-token"
        captchaRef={captchaRef}
        onChangeFormData={(id, label, value) =>
          setFormData({ ...formData, [id]: value })
        }
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

Some things to keep in mind:

- Use the token returned by `execute()`, not a value stored in the form state, to avoid stale values.
- Tokens are single-use: if the form can be submitted again, call `captchaRef.current.reset()` after a successful submit.
- In button mode the submit button should stay disabled until the user has solved the captcha. Use the `useRerCaptchaShowButton()` hook to know which mode is active, and never block the submit in invisible mode.
- `useRerCaptchaActionEnabled('@my-route')` tells you whether the captcha is required for a given route.

See [how it works](https://github.com/RegioneER/collective-rercaptcha/blob/main/frontend/packages/volto-collective-rercaptcha/docs/how-it-works.md) for all the props and the complete integration guide, and the [architecture notes](https://github.com/RegioneER/collective-rercaptcha/blob/main/frontend/packages/volto-collective-rercaptcha/docs/architecture.md) for the internals.

## Exports

| Export | Description |
| --- | --- |
| `default` | The Volto add-on configuration |
| `RerCapWidget` | Low-level, headless wrapper around the Cap widget |
| `useRerCaptchaData` | Returns the `rercaptcha-data` configuration from the backend |
| `useRerCaptchaShowButton` | `true` when the button mode is active |
| `useRerCaptchaActionEnabled` | `true` when the captcha is required for the given route |
| `components/Widget/FormWidget/RerCaptchaWidget` | The form widget, with invisible and button modes |

The add-on also registers a **Captcha Test Block**, useful to check that the Cap server is reachable from the site.

## Links

- Source code: <https://github.com/RegioneER/collective-rercaptcha>
- Issue tracker: <https://github.com/RegioneER/collective-rercaptcha/issues>
- Backend add-on: [`collective.rercaptcha`](https://github.com/RegioneER/collective-rercaptcha/tree/main/backend)
- Changelog: [CHANGELOG.md](https://github.com/RegioneER/collective-rercaptcha/blob/main/frontend/packages/volto-collective-rercaptcha/CHANGELOG.md)
- Cap: <https://capjs.js.org/>

## Development

This add-on lives in the [collective-rercaptcha](https://github.com/RegioneER/collective-rercaptcha) monorepo, together with its backend.
It is developed in isolation with pnpm workspaces and `mrs-developer`.

Prerequisites: [nvm](https://6.docs.plone.org/install/create-project-cookieplone.html#nvm), [Node.js and pnpm](https://6.docs.plone.org/install/create-project.html#node-js), [Make](https://6.docs.plone.org/install/create-project-cookieplone.html#make), [Git](https://6.docs.plone.org/install/create-project-cookieplone.html#git) and, optionally, [Docker](https://docs.docker.com/get-started/get-docker/).

```shell
git clone git@github.com:RegioneER/collective-rercaptcha.git
cd collective-rercaptcha/frontend
make install
```

Start the backend, then the frontend in a separate terminal:

```shell
make backend-docker-start
make start
```

Other useful commands (run `make help` for the full list):

| Command | Description |
| --- | --- |
| `make lint` | Run ESLint, Prettier and Stylelint in check mode |
| `make format` | Run ESLint, Prettier and Stylelint in fix mode |
| `make i18n` | Extract the messages to translate into `locales` |
| `make test` | Run the unit tests |

## Credits

Developed with the support of [Regione Emilia-Romagna](https://www.regione.emilia-romagna.it/), which supports the [PloneGov initiative](https://www.plonegov.it/).

This product was developed by the [RedTurtle Technology](https://www.redturtle.it/) team.

## License

This package is licensed under the [MIT license](https://opensource.org/licenses/MIT).
