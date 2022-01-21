# Setup OPA GitHub Action

[Open Policy Agent (OPA)](https://github.com/open-policy-agent/opa) is an open source, general-purpose policy engine. This GitHub Action downloads and installs the OPA CLI in your GitHub Actions workflow. Subsequent steps in the same job can run the CLI in the same way it is run on the command line using the [GitHub Actions `run` syntax](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepsrun).

## Why

As part of the open source [Infracost](https://github.com/infracost/infracost) project, we're investigating [cost policies](https://github.com/infracost/infracost/discussions/1177). We already have a [set of GitHub Actions](https://github.com/infracost/actions/) to run Infracost, so we made this project to enable users to easily install OPA in GitHub Actions too. The main benefit of this action is that it supports SemVer ranges for the `version` input (see below).

## Usage

The action can be used as follows.

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v1
```

Subsequent steps can run the opa command as needed.

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v1

  - name: Test Policy
    run: opa test policies/*.rego -v
```


## Inputs

The action supports the following inputs:

- `version`: Optional, defaults to `latest`. [SemVer ranges](https://www.npmjs.com/package/semver#ranges) are supported, so instead of a [full version](https://github.com/open-policy-agent/opa/releases) string, you can use `0.35`. This enables you to automatically get the latest backward compatible changes in the v0.35 release.

## Outputs

This action does not set any direct outputs.
