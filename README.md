# Setup OPA GitHub Action

GitHub action to configure the [Open Policy Agent CLI](https://www.openpolicyagent.org/docs/latest/cli/) in your GitHub Actions workflow.

[Open Policy Agent (OPA)](https://github.com/open-policy-agent/opa) is an open source, general-purpose policy engine.

## Running tests

This GitHub Action works great to run any [tests](https://www.openpolicyagent.org/docs/latest/policy-testing/) you have included with your Rego files.

## Basic Usage

Here we see a simple template that checks out the repository code, installs the latest OPA, and then runs all of the Rego files in the `tests` directory.

```yml
name: Run OPA Tests
on: [push]
jobs:
  Run-OPA-Tests:
    runs-on: ubuntu-latest
    steps:
    - name: Check out repository code
      uses: actions/checkout@v3

    - name: Setup OPA
      uses: open-policy-agent/setup-opa@v2
      with:
        version: latest

    - name: Run OPA Tests
      run: opa test tests/*.rego -v
```

## Choose OPA Version

When OPA is installed on the GitHub runner, you can select a the specific version of OPA you wish to run.

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: 0.44.0
```

Or, OPA can be locked to a [SemVer range](https://www.npmjs.com/package/semver#ranges).

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: 0.44.x
```

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: 0.44
```

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: <0.44
```

You may also use the `latest` or `edge` version.

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: latest
```

```yml
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: edge
```

You can also choose to run your tests against multiple versions of OPA.

```yml
strategy:
  matrix:
    version: [latest, 0.44.x, 0.43.x]
steps:
  - name: Setup OPA
    uses: open-policy-agent/setup-opa@v2
    with:
      version: ${{ matrix.version }}
```

## Inputs

The action supports the following inputs:

- `version`: Optional, defaults to `latest`.  `latest`, `edge`, and [SemVer ranges](https://www.npmjs.com/package/semver#ranges) are supported, so instead of a [full version](https://github.com/open-policy-agent/opa/releases) string, you can use `0.44`. This enables you to automatically get the latest backward compatible changes in the v0.44 release.

## Outputs

This action does not set any direct outputs.

## Troubleshooting

### Within GitHub Actions, using Terraform plans as `input` results in `["command"]`

Sometimes, when trying to analyze a JSON-formatted Terraform plan with `opa`,
the `input` is always bound to `["command"]` regardless of the contents of the
plan. This issue is specific to GitHub Actions, and is related to the
`terraform_wrapper` functionality that is enabled by default in the official
[hashicorp/setup-terraform](https://github.com/hashicorp/setup-terraform)
action. Specifically, the `terraform_wrapper` includes extra metadata when
running commands such as `terraform show -json tfplan > tfplan.json`.

There are two primary options for resolving this issue:

- **EITHER** disable the `terraform_wrapper` when using
  [hashicorp/setup-terraform](https://github.com/hashicorp/setup-terraform)

  ```yaml
  - uses: hashicorp/setup-terraform@{{REF}}
    with:
      terraform_wrapper: false
  ```

- **OR** manually "filter" the extra metadata when creating the JSON-formatted
  plan:

  ```yaml
  - run: terraform show -json tfplan | grep '^{.*}$' > tfplan.json
  ```

For a more thorough description of why this happens, see this
[issue](https://github.com/open-policy-agent/opa/issues/5619#issuecomment-1608245191).

## Credits

Thanks to the folks over at [Infracost](https://github.com/infracost/infracost) who created the initial version of this repository.

## Contributions
Contributions are welcome! See [Contributor's Guide](https://www.openpolicyagent.org/docs/latest/contributing/)

## Code of Conduct
👋 Be nice. See our [code of conduct](https://github.com/open-policy-agent/opa/blob/main/CODE_OF_CONDUCT.md)
