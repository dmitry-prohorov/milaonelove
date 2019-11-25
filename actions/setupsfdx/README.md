# setup-node

<p align="left">
  <a href="https://github.com/dmitry-prohorov/setup-sfdx"><img alt="GitHub Actions status" src="https://github.com/dmitry-prohorov/setup-sfdx/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets up sfdx environment for use in actions by:

- optionally downloading and caching the latest version of sfdx-cli by version and adding to PATH.

# Usage

See [action.yml](action.yml)

Basic:

```yaml
steps:
  - uses: dmitry-prohorov/setup-sfdx@v1
  - run: sfdx version
```

Matrix Testing:

```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    name: OS ${{ matrix.os }} sample
    steps:
      - name: Setup sfdx
        uses: dmitry-prohorov/setup-sfdx@v1
      - run: sfdx version
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
