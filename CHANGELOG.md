# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Frontend**: Fixed dark mode styling inconsistencies in the profile pages.
  - Replaced hardcoded `bg-white/80` and `bg-white` with DaisyUI semantic token `bg-base-100` in profile forms.
  - Replaced `border-white` with `border-base-100` on avatar rings and skeleton loaders.
  - Corrected section backgrounds to use `bg-base-100/80` for backdrop-blur transparency that adapts to theme.
  - Applied fixes across both Patient and Clinician profile views and their respective form components.
- **Frontend**: Fixed profile skeleton loaders to properly respect dark mode by avoiding hardcoded white borders.
