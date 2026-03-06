# collective.rercaptcha

Integration with captcha validator in Plone

## Features

This project implements an event subscriber that catch every IBeforeTraverseEvent event and an expander for using the functionality from the frontend.

In order to be checked by the captcha service, a request:
- has to be a POST request
- has to be included in a list (configurable from the controlpanel)

The custom frontend form will send a request to an eternal captcha valdidator service and recieve a token that will be sent to the backend with all the POST payload.
The backend will then verify the legitimacy of the request by checking the same external service for a confirmation.

All requests that are not POST will not be checked.
All POST requests that are not on the configurable list will not be checked.
All POST requests on the list that don't have the token in the payload will be blocked.
All POST requests on the list that have a token not validated by the external service will be blocked.

### Configuration

A custom controlpanel is added for easy configurability:
- `use_captcha`, a boolean value that enables the checks
- `captcha_uri`, the url to the external validator
- `whitelisted_routes`, the routes (last portions of urls) that will be subject to the validator.
- `captcha_site_key` and `captcha_secret`, used during the validator phase in the backend, in the shape shown below:

```python
requests.post(
    f"{captcha_uri}/{captcha_site_key}/siteverify",
    data={"secret": captcha_secret, "response": token})
```

every custom form that implements this service will have to read the custom expander:
```python
"rercaptcha-data": {
    "@id": ...,
    "captcha-url": captcha_uri,
    "captcha-site-key": captcha_site_key,
}
```

## Installation

Install collective.rercaptcha with uv.

```shell
uv add collective.rercaptcha
```

Create the Plone site.

```shell
make create-site
```

## Contribute

- [Issue tracker](https://github.com/collective/collective-rercaptcha/issues)
- [Source code](https://github.com/collective/collective-rercaptcha/)

### Prerequisites ✅

-   An [operating system](https://6.docs.plone.org/install/create-project-cookieplone.html#prerequisites-for-installation) that runs all the requirements mentioned.
-   [uv](https://6.docs.plone.org/install/create-project-cookieplone.html#uv)
-   [Make](https://6.docs.plone.org/install/create-project-cookieplone.html#make)
-   [Git](https://6.docs.plone.org/install/create-project-cookieplone.html#git)
-   [Docker](https://docs.docker.com/get-started/get-docker/) (optional)

### Installation 🔧

1.  Clone this repository.

    ```shell
    git clone git@github.com:collective/collective-rercaptcha.git
    cd collective-rercaptcha/backend
    ```

2.  Install this code base.

    ```shell
    make install
    ```


### Add features using `plonecli` or `bobtemplates.plone`

This package provides markers as strings (`<!-- extra stuff goes here -->`) that are compatible with [`plonecli`](https://github.com/plone/plonecli) and [`bobtemplates.plone`](https://github.com/plone/bobtemplates.plone).
These markers act as hooks to add all kinds of features through subtemplates, including behaviors, control panels, upgrade steps, or other subtemplates from `bobtemplates.plone`.
`plonecli` is a command line client for `bobtemplates.plone`, adding autocompletion and other features.

To add a feature as a subtemplate to your package, use the following command pattern.

```shell
make add <template_name>
```

For example, you can add a content type to your package with the following command.

```shell
make add content_type
```

You can add a behavior with the following command.

```shell
make add behavior
```

```{seealso}
You can check the list of available subtemplates in the [`bobtemplates.plone` `README.md` file](https://github.com/plone/bobtemplates.plone/?tab=readme-ov-file#provided-subtemplates).
See also the documentation of [Mockup and Patternslib](https://6.docs.plone.org/classic-ui/mockup.html) for how to build the UI toolkit for Classic UI.
```

## License

The project is licensed under GPLv2.

## Credits and acknowledgements 🙏

Generated from the [`cookieplone-templates`  template](https://github.com/plone/cookieplone-templates/tree/main/) on 2026-03-02 13:59:22.. A special thanks to all contributors and supporters!
