---
date: "2020-03-24T00:00:00Z"
external_link: ""
image:
  caption: Photo by Tiago Olivoto
  focal_point: Smart
links:
- icon: github
  icon_pack: fab
  name: Follow on Github
  url: https://github.com/TiagoOlivoto/metan
- icon: r-project
  icon_pack: fab
  name: Follow on CRAN
  url: https://cran.r-project.org/web/packages/metan/
summary: An R package for multi-environment trial analysis
tags:
- Pacotes R
- metan
- Genotype-Environment Interaction
- Plant breeding
- Experimental statistics
title: R package metan
url_code: "https://tiagoolivoto.github.io/metan/"
url_pdf: ""
url_slides: ""
url_video: "https://youtu.be/dTh6Zq8fXUM"
---

metan (**m**ulti-**e**nvironment **t**rials **an**alysis) provides useful functions for analyzing multi-environment trial data using parametric and nonparametric methods. The package will help you to:
  - Inspect data for possible common errors;
  - Manipulate rows and columns;
  - Manipulate numbers and strings;
  - Compute descriptive statistics;
  - Compute within-environment analysis of variance;
  - Compute AMMI analysis with prediction considering different numbers
    of interaction principal component axes;
  - Compute AMMI-based stability indexes;
  - Compute GGE biplot analysis;
  - Compute BLUP-based stability indexes;
  - Compute variance components and genetic parameters in mixed-effect
    models;
  - Perform cross-validation procedures for AMMI-family and BLUP models;
  - Compute parametric and nonparametric stability statistics
  - Implement biometrical models

# Installation

Install the released version of metan from
[CRAN](https://CRAN.R-project.org/package=metan) with:

``` r
install.packages("metan")
```

Or install the development version from
[GitHub](https://github.com/TiagoOlivoto/metan) with:

``` r
devtools::install_github("TiagoOlivoto/metan")

# To build the HTML vignette use
devtools::install_github("TiagoOlivoto/metan", build_vignettes = TRUE)
```

*Note*: If you are a Windows user, you should also first download and
install the latest version of
[Rtools](https://cran.r-project.org/bin/windows/Rtools/).

For the latest release notes on this development version, see the [NEWS
file](https://tiagoolivoto.github.io/metan/news/index.html).

## Cheatsheet

<a href="https://github.com/TiagoOlivoto/metan/raw/master/metan_cheat_sheet.pdf"><img src="https://raw.githubusercontent.com/TiagoOlivoto/metan/master/man/figures/metan_cheat_sheet.png" width="720" height="510"/></a>


# Citation

To cite `metan` in your publications, please, use the official reference paper:
> Olivoto, T., and Lúcio, A.D. (2020). metan: an R package for multi-environment trial analysis. *Methods Ecol Evol*. Accepted Author Manuscript doi:10.1111/2041-210X.13384

A BibTeX entry for LaTeX users is


``` r
  @Article{Olivoto2020,
    author = {Tiago Olivoto and Alessandro Dal'Col L{'{u}}cio},
    title = {metan: an R package for multi-environment trial analysis},
    journal = {Methods in Ecology and Evolution},
    volume = {n/a},
    number = {n/a},
    year = {2020},
    doi = {10.1111/2041-210X.13384},
    url = {https://besjournals.onlinelibrary.wiley.com/doi/abs/10.1111/2041-210X.13384},
  }
```

