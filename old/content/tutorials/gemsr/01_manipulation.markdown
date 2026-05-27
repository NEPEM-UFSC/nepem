---
title: Manipulação de dados
linktitle: "1. Manipulação de dados"
toc: true
type: docs
date: "2021/07/09"
draft: false
df_print: paged
code_download: true
menu:
  gemsr:
    parent: GEMS-R
    weight: 2
weight: 1
---

# Pacotes

```r
library(tidyverse)  # manipulação de dados
library(metan)
library(rio)        # importação/exportação de dados

# gerar tabelas html
print_tbl <- function(table, digits = 3, n = NULL, ...){
  if(!missing(n)){
    knitr::kable(head(table, n = n), booktabs = TRUE, digits = digits, ...)
  } else{
  knitr::kable(table, booktabs = TRUE, digits = digits, ...)
  }
}
```


# Formatar strings

A função `tidy_strings()` pode ser usada para organizar strings de caracteres colocando todas as palavras em maiúsculas, substituindo qualquer espaço, tabulação, caracteres de pontuação por `_` e colocando `_` entre maiúsculas e minúsculas.

## Um exemplo simples
Suponha que tenhamos uma string de caracteres, digamos, `str = c("Env1", "env 1", "env.1")`. Por definição, `str` deve representar um nível único em testes de melhoramento de plantas, por exemplo, ambiente 1, mas na verdade tem três níveis.

```r
str <- c ("Env1", "env 1", "env.1")
str %>% factor() %>% levels()
## [1] "env 1" "env.1" "Env1"
```


```r
tidy_strings(str)
## [1] "ENV_1" "ENV_1" "ENV_1"
```
Excelente! Agora temos o nível único que deveríamos ter antes.

## Mais exemplos
Todos os itens a seguir serão convertidos para `" ENV_1 "`.

```r
messy_env <- c ("ENV 1", "Env 1", "Env1", "env1", "Env.1", "Env_1")
tidy_strings(messy_env)
## [1] "ENV_1" "ENV_1" "ENV_1" "ENV_1" "ENV_1" "ENV_1"
```

Todos os itens a seguir serão traduzidos em `" GEN _ * "`.

```r
messy_gen <- c ("GEN1", "gen 2", "Gen.3", "gen-4", "Gen_5", "GEN_6")
tidy_strings(messy_gen)
## [1] "GEN_1" "GEN_2" "GEN_3" "GEN_4" "GEN_5" "GEN_6"
```

Todos os itens a seguir serão traduzidos para `" ENV_GEN "`

```r
messy_int <- c ("EnvGen", "Env_Gen", "env gen", "Env Gen", "ENV.GEN", "ENV_GEN")
tidy_strings(messy_int)
## [1] "ENV_GEN" "ENV_GEN" "ENV_GEN" "ENV_GEN" "ENV_GEN" "ENV_GEN"
```



## Organize data.frames
Também podemos organizar strings de um data.frame. Por padrão, o caractere separador é `_`. Para alterar esse padrão, use o argumento `sep`.

```r
df <- tibble(Env = messy_env,
             gen = messy_gen,
             Env_Gen = interaction(Env, gen),
             y = rnorm(6, 300, 10))
print_tbl(df)
```



|Env   |gen   |Env_Gen     |       y|
|:-----|:-----|:-----------|-------:|
|ENV 1 |GEN1  |ENV 1.GEN1  | 288.213|
|Env 1 |gen 2 |Env 1.gen 2 | 286.460|
|Env1  |Gen.3 |Env1.Gen.3  | 291.560|
|env1  |gen-4 |env1.gen-4  | 289.837|
|Env.1 |Gen_5 |Env.1.Gen_5 | 302.320|
|Env_1 |GEN_6 |Env_1.GEN_6 | 273.705|

```r

df_tidy <- tidy_strings(df, sep = "")
print_tbl(df_tidy)
```



|Env  |gen  |Env_Gen  |       y|
|:----|:----|:--------|-------:|
|ENV1 |GEN1 |ENV1GEN1 | 288.213|
|ENV1 |GEN2 |ENV1GEN2 | 286.460|
|ENV1 |GEN3 |ENV1GEN3 | 291.560|
|ENV1 |GEN4 |ENV1GEN4 | 289.837|
|ENV1 |GEN5 |ENV1GEN5 | 302.320|
|ENV1 |GEN6 |ENV1GEN6 | 273.705|



# Conjunto de dados


```r
# Dados "bagunçados"
# Apenas 40 linhas 
df_messy <- import("http://bit.ly/df_messy", setclass = "tbl")
df_messy %>% print_tbl(n = 40)
```



|env   |Gen | BLOCO| Alt plant| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |    NGE|
|:-----|:---|-----:|---------:|-------:|------:|------:|-------:|-------:|------:|----:|:------|------:|
|Amb 1 |H10 |     1|      0.00|    1.64|  16.72|  54.05|   31.66|   17.40| 193.69| 15.6|379.61 |  519.2|
|NA    |NA  |     2|      2.79|    1.71|  14.90|  52.73|   32.03|   15.48| 176.43| 17.6|346.88 |  502.4|
|NA    |NA  |     3|      2.72|    1.51|  16.68|  52.74|   30.40|   17.50| 207.11| 16.8|394.03 |  524.6|
|NA    |H11 |     1|      2.75|    1.51|  17.42|  51.69|   30.64|   17.98| 217.29| 16.8|376.65 |     NA|
|NA    |NA  |     2|      2.72|    1.56|  16.70|  47.21|   28.69|   17.20| 181.28| 13.6|360.66 |  500.8|
|NA    |NA  |     3|      2.77|    1.67|  15.78|  47.87|   27.63|   16.36| 166.19| 15.2|321.8  |  512.8|
|NA    |H12 |     1|      2.73|    1.54|  14.88|  47.51|   28.22|   15.54| 160.98| 14.8|344.84 |  480.2|
|NA    |NA  |     2|      2.56|    1.56|  15.68|  49.86|   29.85|   16.16| 187.96| 17.2|328.33 |  585.8|
|NA    |NA  |     3|      2.79|    1.53|  14.98|  52.67|   31.38|   15.24| 192.51| 20.0|325.36 |  594.0|
|NA    |H13 |     1|      2.74|    1.60|  14.64|  54.00|   32.48|   15.06| 205.34| 20.0|334.37 |  628.4|
|NA    |NA  |     2|      2.64|    1.37|  14.80|  53.73|   30.97|   15.54| 238.55| 20.4|348.72 |  693.2|
|NA    |NA  |     3|      2.93|    1.77|  14.92|  52.66|   30.07|   15.76| 211.92| 15.6|421.23 |  511.6|
|NA    |H2  |     1|      2.55|    1.22|  15.08|  51.66|   27.71|   15.30| 197.70| 16.4|382.06 |  518.2|
|NA    |NA  |     2|      2.90|    1.41|  15.12|  51.53|   26.04|   16.00| 212.18| 21.2|304.51 |  696.6|
|NA    |NA  |     3|      2.92|    1.39|  14.78|  52.63|   26.04|   15.14| 201.62| 20.0|300.02 |  650.4|
|NA    |H3  |     1|      3.04|    1.43|  15.02|  51.66|   25.93|   16.56| 209.80| 19.6|317.48 |  641.6|
|NA    |NA  |     2|      2.94|    1.66|  14.88|  51.46|   31.33|   15.46| 192.84| 18.0|345.83 |  550.6|
|NA    |NA  |     3|      2.82|    1.67|  16.46|  52.25|   26.74|   17.08| 191.99| 18.0|311.73 |  637.4|
|NA    |H4  |     1|      3.02|    1.82|  16.54|  50.43|   27.31|   17.26| 193.02| 16.8|305.33 |     NA|
|NA    |NA  |     2|      2.84|    1.69|  15.04|  52.17|   27.95|   15.72| 215.69| 18.4|357.3  |  613.6|
|NA    |NA  |     3|      2.74|    1.52|  16.34|  49.57|   27.01|   17.10| 196.76| 14.0|350.15 |  562.2|
|NA    |H5  |     1|      2.90|    1.58|  16.02|  48.66|   27.99|   17.00| 198.18| 14.0|373.79 | 5302.0|
|NA    |NA  |     2|      2.82|    1.61|  14.68|  50.26|   27.87|   16.15| 180.83| 14.4|352.22 |  508.6|
|NA    |NA  |     3|      2.78|    1.59|  16.60|  50.64|   29.08|   16.94| 199.09| 15.2|343.47 |  577.6|
|NA    |H6  |     1|      2.90|    1.59|  17.10|  54.86|   32.04|   17.94| 250.89| 17.6|386.55 |  648.0|
|NA    |NA  |     2|      2.74|    1.69|  16.80|  53.08|   31.23|   17.60| 225.47| 16.0|402.7  |  560.8|
|NA    |NA  |     3|      2.67|    1.45|  16.10|  54.40|   31.81|   17.22| 219.20| 16.8|447    |  496.8|
|NA    |H7  |     1|      2.87|    1.56|  16.60|  50.27|   28.42|   17.12| 206.30| 16.8|337.42 |  608.4|
|NA    |NA  |     2|      2.78|    1.67|  15.38|  52.03|   32.49|   16.52| 163.34| 18.0|344.58 |  494.0|
|NA    |NA  |     3|      2.68|    1.56|  14.34|  50.27|   31.01|   14.76| 175.00| 18.8|332.29 |  529.6|
|NA    |H8  |     1|      2.59|    1.30|  12.74|  51.03|   30.03|   14.14| 184.87| 18.8|312.86 |  597.8|
|NA    |NA  |     2|      2.76|    1.55|  17.08|  52.43|   34.66|   18.26| 211.57| 17.2|372.25 |  565.2|
|NA    |NA  |     3|      2.73|    1.54|  15.60|  53.31|   32.61|   17.00| 191.89| 15.6|412.06 |  462.4|
|NA    |H9  |     1|      3.00|    1.71|  12.24|  51.78|   31.58|   15.06| 182.83| 14.4|410.02 |  445.4|
|NA    |NA  |     2|      2.96|    1.61|  17.50|  53.62|   32.51|   18.12| 224.00| 14.4|439.06 |  510.4|
|NA    |NA  |     3|      2.81|    1.69|  16.80|  52.69|   31.76|   17.66| 205.69| 16.0|390.18 |  509.8|
|AMB2  |H1  |     1|      3.00|    1.88|  15.14|  50.79|   31.11|   15.64| 190.56| 16.4|389.35 |  488.2|
|NA    |NA  |     2|      2.97|    1.83|  15.16|  52.09|   31.22|   15.70| 197.04| 17.2|390.39 |  506.2|
|NA    |NA  |     3|      2.81|    1.67|  14.62|  52.74|   32.21|   15.14| 176.99| 17.6|387.06 |  458.8|
|NA    |H10 |     1|      2.10|    0.91|  16.04|  46.69|   27.22|   17.10| 150.98| 15.2|286.08 |  541.8|






```r
df_tidy <- 
  df_messy %>% 
  tidy_colnames() %>% # formata nomes das variáveis
  fill_na() %>%  # preenche NAs
  tidy_strings(sep = "") # formata strings

df_tidy %>% print_tbl(n = 40)
```



|ENV  |GEN | BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |    NGE|
|:----|:---|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|------:|
|AMB1 |H10 |     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 |  519.2|
|AMB1 |H10 |     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 |  502.4|
|AMB1 |H10 |     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 |  524.6|
|AMB1 |H11 |     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 |  524.6|
|AMB1 |H11 |     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 |  500.8|
|AMB1 |H11 |     3|      2.77|    1.67|  15.78|  47.87|    27.63|    16.36| 166.19| 15.2|3218  |  512.8|
|AMB1 |H12 |     1|      2.73|    1.54|  14.88|  47.51|    28.22|    15.54| 160.98| 14.8|34484 |  480.2|
|AMB1 |H12 |     2|      2.56|    1.56|  15.68|  49.86|    29.85|    16.16| 187.96| 17.2|32833 |  585.8|
|AMB1 |H12 |     3|      2.79|    1.53|  14.98|  52.67|    31.38|    15.24| 192.51| 20.0|32536 |  594.0|
|AMB1 |H13 |     1|      2.74|    1.60|  14.64|  54.00|    32.48|    15.06| 205.34| 20.0|33437 |  628.4|
|AMB1 |H13 |     2|      2.64|    1.37|  14.80|  53.73|    30.97|    15.54| 238.55| 20.4|34872 |  693.2|
|AMB1 |H13 |     3|      2.93|    1.77|  14.92|  52.66|    30.07|    15.76| 211.92| 15.6|42123 |  511.6|
|AMB1 |H2  |     1|      2.55|    1.22|  15.08|  51.66|    27.71|    15.30| 197.70| 16.4|38206 |  518.2|
|AMB1 |H2  |     2|      2.90|    1.41|  15.12|  51.53|    26.04|    16.00| 212.18| 21.2|30451 |  696.6|
|AMB1 |H2  |     3|      2.92|    1.39|  14.78|  52.63|    26.04|    15.14| 201.62| 20.0|30002 |  650.4|
|AMB1 |H3  |     1|      3.04|    1.43|  15.02|  51.66|    25.93|    16.56| 209.80| 19.6|31748 |  641.6|
|AMB1 |H3  |     2|      2.94|    1.66|  14.88|  51.46|    31.33|    15.46| 192.84| 18.0|34583 |  550.6|
|AMB1 |H3  |     3|      2.82|    1.67|  16.46|  52.25|    26.74|    17.08| 191.99| 18.0|31173 |  637.4|
|AMB1 |H4  |     1|      3.02|    1.82|  16.54|  50.43|    27.31|    17.26| 193.02| 16.8|30533 |  637.4|
|AMB1 |H4  |     2|      2.84|    1.69|  15.04|  52.17|    27.95|    15.72| 215.69| 18.4|3573  |  613.6|
|AMB1 |H4  |     3|      2.74|    1.52|  16.34|  49.57|    27.01|    17.10| 196.76| 14.0|35015 |  562.2|
|AMB1 |H5  |     1|      2.90|    1.58|  16.02|  48.66|    27.99|    17.00| 198.18| 14.0|37379 | 5302.0|
|AMB1 |H5  |     2|      2.82|    1.61|  14.68|  50.26|    27.87|    16.15| 180.83| 14.4|35222 |  508.6|
|AMB1 |H5  |     3|      2.78|    1.59|  16.60|  50.64|    29.08|    16.94| 199.09| 15.2|34347 |  577.6|
|AMB1 |H6  |     1|      2.90|    1.59|  17.10|  54.86|    32.04|    17.94| 250.89| 17.6|38655 |  648.0|
|AMB1 |H6  |     2|      2.74|    1.69|  16.80|  53.08|    31.23|    17.60| 225.47| 16.0|4027  |  560.8|
|AMB1 |H6  |     3|      2.67|    1.45|  16.10|  54.40|    31.81|    17.22| 219.20| 16.8|447   |  496.8|
|AMB1 |H7  |     1|      2.87|    1.56|  16.60|  50.27|    28.42|    17.12| 206.30| 16.8|33742 |  608.4|
|AMB1 |H7  |     2|      2.78|    1.67|  15.38|  52.03|    32.49|    16.52| 163.34| 18.0|34458 |  494.0|
|AMB1 |H7  |     3|      2.68|    1.56|  14.34|  50.27|    31.01|    14.76| 175.00| 18.8|33229 |  529.6|
|AMB1 |H8  |     1|      2.59|    1.30|  12.74|  51.03|    30.03|    14.14| 184.87| 18.8|31286 |  597.8|
|AMB1 |H8  |     2|      2.76|    1.55|  17.08|  52.43|    34.66|    18.26| 211.57| 17.2|37225 |  565.2|
|AMB1 |H8  |     3|      2.73|    1.54|  15.60|  53.31|    32.61|    17.00| 191.89| 15.6|41206 |  462.4|
|AMB1 |H9  |     1|      3.00|    1.71|  12.24|  51.78|    31.58|    15.06| 182.83| 14.4|41002 |  445.4|
|AMB1 |H9  |     2|      2.96|    1.61|  17.50|  53.62|    32.51|    18.12| 224.00| 14.4|43906 |  510.4|
|AMB1 |H9  |     3|      2.81|    1.69|  16.80|  52.69|    31.76|    17.66| 205.69| 16.0|39018 |  509.8|
|AMB2 |H1  |     1|      3.00|    1.88|  15.14|  50.79|    31.11|    15.64| 190.56| 16.4|38935 |  488.2|
|AMB2 |H1  |     2|      2.97|    1.83|  15.16|  52.09|    31.22|    15.70| 197.04| 17.2|39039 |  506.2|
|AMB2 |H1  |     3|      2.81|    1.67|  14.62|  52.74|    32.21|    15.14| 176.99| 17.6|38706 |  458.8|
|AMB2 |H10 |     1|      2.10|    0.91|  16.04|  46.69|    27.22|    17.10| 150.98| 15.2|28608 |  541.8|

```r

# exportar os dados 'arrumados'
# export(df_tidy, "df_tidy.xlsx")
```



# Utilitários para linhas e colunas
## Adicionar colunas e linhas
As funções `add_cols()` e `add_rows()` podem ser usadas para adicionar colunas e linhas, respectivamente, a um data.frame. Também é possível adicionar uma coluna com base nos dados existentes. Observe que os argumentos `.after` e` .before` são usados para selecionar a posição da(s) nova(s) coluna(s). Isso é particularmente útil para colocar variáveis da mesma categoria juntas.


```r
df_tidy2 <- 
  add_cols(df_tidy,
           ALT_PLANT_CM = ALT_PLANT * 100,
           .after = ALT_PLANT)
print_tbl(df_tidy2, n = 5)
```



|ENV  |GEN | BLOCO| ALT_PLANT| ALT_PLANT_CM| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:---|-----:|---------:|------------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |H10 |     1|      0.00|            0|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |H10 |     2|      2.79|          279|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |H10 |     3|      2.72|          272|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |H11 |     1|      2.75|          275|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |H11 |     2|      2.72|          272|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

## Selecionar ou remover colunas e linhas
As funções `select_cols()` e `select_rows()` podem ser usadas para selecionar colunas e linhas, respectivamente de um quadro de dados.


```r
select_cols(df_tidy, ENV, GEN) %>% print_tbl(n = 5)
```



|ENV  |GEN |
|:----|:---|
|AMB1 |H10 |
|AMB1 |H10 |
|AMB1 |H10 |
|AMB1 |H11 |
|AMB1 |H11 |

```r
select_rows(df_tidy, 1:3) %>% print_tbl(n = 5)
```



|ENV  |GEN | BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:---|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |H10 |     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |H10 |     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |H10 |     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|

As colunas numéricas podem ser selecionadas usando a função `select_numeric_cols()`. Colunas não numéricas são selecionadas com `select_non_numeric_cols()`.


```r
select_numeric_cols(df_tidy) %>% print_tbl(n = 5)
```



| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|   NGE|
|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|-----:|
|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6| 519.2|
|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6| 502.4|
|     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8| 524.6|
|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8| 524.6|
|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6| 500.8|

```r


# Implementação dplyr
select(df_tidy, where(is.numeric)) %>% print_tbl(n = 5)
```



| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|   NGE|
|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|-----:|
|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6| 519.2|
|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6| 502.4|
|     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8| 524.6|
|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8| 524.6|
|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6| 500.8|

```r


select_non_numeric_cols(df_tidy) %>% print_tbl(n = 5)
```



|ENV  |GEN |MMG   |
|:----|:---|:-----|
|AMB1 |H10 |37961 |
|AMB1 |H10 |34688 |
|AMB1 |H10 |39403 |
|AMB1 |H11 |37665 |
|AMB1 |H11 |36066 |

```r


# Implementação dplyr
select(df_tidy, where(~!is.numeric(.x))) %>% print_tbl(n = 5)
```



|ENV  |GEN |MMG   |
|:----|:---|:-----|
|AMB1 |H10 |37961 |
|AMB1 |H10 |34688 |
|AMB1 |H10 |39403 |
|AMB1 |H11 |37665 |
|AMB1 |H11 |36066 |

Podemos selecionar a primeira ou última coluna rapidamente com `select_first_col()` e `select_last_col()`, respectivamente.


```r
select_first_col(df_tidy) %>% print_tbl(n = 5)
```



|ENV  |
|:----|
|AMB1 |
|AMB1 |
|AMB1 |
|AMB1 |
|AMB1 |

```r
select_last_col(df_tidy) %>% print_tbl(n = 5)
```



|   NGE|
|-----:|
| 519.2|
| 502.4|
| 524.6|
| 524.6|
| 500.8|


Para remover colunas ou linhas, use `remove_cols()` e `remove_rows()`.

```r
remove_cols(df_tidy, ENV, GEN) %>% print_tbl(n = 5)
```



| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

```r

# Implementação dplyr
select(df_tidy, -c(ENV, GEN)) %>% print_tbl(n = 5)
```



| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|


## Concatenar colunas
A função `concatetate()` pode ser usada para concatenar várias colunas de um data.frame. Ela retorna o data.frame com todas as colunas originais em `.data` mais a variável concatenada, após a última coluna(por padrão), ou em qualquer posição ao usar os argumentos` .before` ou `.after`.



```r
concatenado <- 
  concatenate(df_tidy, ENV, GEN, BLOCO,
              .after = BLOCO, 
              new_var = FATORES)
print_tbl(concatenado, n = 5)
```



|ENV  |GEN | BLOCO|FATORES    | ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:---|-----:|:----------|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |H10 |     1|AMB1_H10_1 |      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |H10 |     2|AMB1_H10_2 |      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |H10 |     3|AMB1_H10_3 |      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |H11 |     1|AMB1_H11_1 |      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |H11 |     2|AMB1_H11_2 |      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

Para eliminar as variáveis existentes e manter apenas a coluna concatenada, use o argumento `drop = TRUE`. Para usar `concatenate()` dentro de uma determinada função como `add_cols()` use o argumento `pull = TRUE` para puxar os resultados para um vetor.

```r
concatenate(df_tidy, ENV, GEN, BLOCO, drop = TRUE) %>% head()
## # A tibble: 6 x 1
##   new_var   
##   <chr>     
## 1 AMB1_H10_1
## 2 AMB1_H10_2
## 3 AMB1_H10_3
## 4 AMB1_H11_1
## 5 AMB1_H11_2
## 6 AMB1_H11_3
concatenate(df_tidy, ENV, GEN, BLOCO, pull = TRUE) %>% head()
## [1] "AMB1_H10_1" "AMB1_H10_2" "AMB1_H10_3" "AMB1_H11_1" "AMB1_H11_2"
## [6] "AMB1_H11_3"
```


## Obtendo níveis
Para obter os níveis e o número de níveis de um fator, as funções `get_levels()` e `get_level_size()` podem ser usadas.


```r
get_levels(df_tidy, ENV)
## [1] "AMB1" "AMB2" "AMB3"
get_level_size(df_tidy, ENV) %>% print_tbl()
```



|ENV  | GEN| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB| MGE| NFIL| MMG| NGE|
|:----|---:|-----:|---------:|-------:|------:|------:|--------:|--------:|---:|----:|---:|---:|
|AMB1 |  36|    36|        36|      36|     36|     36|       36|       36|  36|   36|  36|  36|
|AMB2 |  39|    39|        39|      39|     39|     39|       39|       39|  39|   39|  39|  39|
|AMB3 |  39|    39|        39|      39|     39|     39|       39|       39|  39|   39|  39|  39|


# Utilitários para números e strings
## Arredondando valores
A função `round_cols()` arredonda uma coluna selecionada ou um data.frame completo para o número especificado de casas decimais (padrão 0). Se nenhuma variável for informada, todas as variáveis numéricas serão arredondadas.


```r
round_cols(df_tidy, digits = 1) %>% print_tbl(n = 5)
```



|ENV  |GEN | BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|   MGE| NFIL|MMG   |   NGE|
|:----|:---|-----:|---------:|-------:|------:|------:|--------:|--------:|-----:|----:|:-----|-----:|
|AMB1 |H10 |     1|       0.0|     1.6|   16.7|   54.0|     31.7|     17.4| 193.7| 15.6|37961 | 519.2|
|AMB1 |H10 |     2|       2.8|     1.7|   14.9|   52.7|     32.0|     15.5| 176.4| 17.6|34688 | 502.4|
|AMB1 |H10 |     3|       2.7|     1.5|   16.7|   52.7|     30.4|     17.5| 207.1| 16.8|39403 | 524.6|
|AMB1 |H11 |     1|       2.8|     1.5|   17.4|   51.7|     30.6|     18.0| 217.3| 16.8|37665 | 524.6|
|AMB1 |H11 |     2|       2.7|     1.6|   16.7|   47.2|     28.7|     17.2| 181.3| 13.6|36066 | 500.8|

Alternativamente, selecione variáveis para arredondar.

```r
round_cols(df_tidy, ALT_PLANT:COMPES, digits = 0) %>% print_tbl(n = 5)
```



|ENV  |GEN | BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:---|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |H10 |     1|         0|       2|     17|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |H10 |     2|         3|       2|     15|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |H10 |     3|         3|       2|     17|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |H11 |     1|         3|       2|     17|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |H11 |     2|         3|       2|     17|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

## Extraindo e substituindo números

As funções `extract_number()` e `replace_number()` podem ser usadas para extrair ou substituir números. Como exemplo, iremos extrair o número de cada genótipo em `df_tidy`. Por padrão, os números extraídos são colocados como uma nova variável chamada `new_var` após a última coluna dos dados.


```r
extract_number(df_tidy, GEN) %>% print_tbl(n = 5)
```



|ENV  | GEN| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|---:|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |  10|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |  10|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |  10|     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |  11|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |  11|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

Para substituir os números de uma determinada coluna por uma substituição especificada, use `replace_number()`. Por padrão, os números são substituídos por "".


```r
replace_number(df_tidy,
               BLOCO,
               pattern  = "1",
               replacement  = "Rep_1") %>% 
  print_tbl(n = 5)
```



|ENV  |GEN |BLOCO | ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:---|:-----|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |H10 |Rep_1 |      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |H10 |2     |      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |H10 |3     |      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |H11 |Rep_1 |      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |H11 |2     |      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

## Extraindo, substituindo e removendo strings
As funções `extract_string()` e `replace_string()` são usadas no mesmo contexto de `extract_number()` e `replace_number()`, mas para lidar com strings.


```r
extract_string(df_tidy, GEN) %>% print_tbl(n = 5)
```



|ENV  |GEN | BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:---|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |H   |     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |H   |     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |H   |     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |H   |     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |H   |     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|

Para substituir strings, podemos usar a função `replace_strings()`.

```r
replace_string(df_tidy,
               GEN,
               pattern = "H",
               replacement  = "GEN_") %>% 
  print_tbl(n = 5)
```



|ENV  |GEN    | BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |   NGE|
|:----|:------|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|-----:|
|AMB1 |GEN_10 |     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 | 519.2|
|AMB1 |GEN_10 |     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 | 502.4|
|AMB1 |GEN_10 |     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8|39403 | 524.6|
|AMB1 |GEN_11 |     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 | 524.6|
|AMB1 |GEN_11 |     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 | 500.8|


## metan > GÊNES
Para remover todas as strings de um quadro de dados, use `remove_strings()`.

```r
remove_strings(df_tidy) %>% print_tbl(n = 5)
```



| ENV| GEN| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|   MMG|   NGE|
|---:|---:|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|-----:|-----:|
|   1|  10|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6| 37961| 519.2|
|   1|  10|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6| 34688| 502.4|
|   1|  10|     3|      2.72|    1.51|  16.68|  52.74|    30.40|    17.50| 207.11| 16.8| 39403| 524.6|
|   1|  11|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8| 37665| 524.6|
|   1|  11|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6| 36066| 500.8|


## metan > Selegen

```r
df_selegen <- 
  df_to_selegen_54(df_tidy,
                   env = ENV,
                   gen = GEN,
                   rep = BLOCO)
## The data `df_tidy` has been arranged according to the `ENV` and `BLOCO` columns.
print_tbl(df_selegen, n = 15)
```



|ENV  | PARCELA|GEN |REP |REPETICAO | OBS| BLOCO| ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|    MGE| NFIL|MMG   |    NGE|
|:----|-------:|:---|:---|:---------|---:|-----:|---------:|-------:|------:|------:|--------:|--------:|------:|----:|:-----|------:|
|AMB1 |       1|H10 |1   |AMB1_H10  |   1|     1|      0.00|    1.64|  16.72|  54.05|    31.66|    17.40| 193.69| 15.6|37961 |  519.2|
|AMB1 |       2|H11 |1   |AMB1_H11  |   1|     1|      2.75|    1.51|  17.42|  51.69|    30.64|    17.98| 217.29| 16.8|37665 |  524.6|
|AMB1 |       3|H12 |1   |AMB1_H12  |   1|     1|      2.73|    1.54|  14.88|  47.51|    28.22|    15.54| 160.98| 14.8|34484 |  480.2|
|AMB1 |       4|H13 |1   |AMB1_H13  |   1|     1|      2.74|    1.60|  14.64|  54.00|    32.48|    15.06| 205.34| 20.0|33437 |  628.4|
|AMB1 |       5|H2  |1   |AMB1_H2   |   1|     1|      2.55|    1.22|  15.08|  51.66|    27.71|    15.30| 197.70| 16.4|38206 |  518.2|
|AMB1 |       6|H3  |1   |AMB1_H3   |   1|     1|      3.04|    1.43|  15.02|  51.66|    25.93|    16.56| 209.80| 19.6|31748 |  641.6|
|AMB1 |       7|H4  |1   |AMB1_H4   |   1|     1|      3.02|    1.82|  16.54|  50.43|    27.31|    17.26| 193.02| 16.8|30533 |  637.4|
|AMB1 |       8|H5  |1   |AMB1_H5   |   1|     1|      2.90|    1.58|  16.02|  48.66|    27.99|    17.00| 198.18| 14.0|37379 | 5302.0|
|AMB1 |       9|H6  |1   |AMB1_H6   |   1|     1|      2.90|    1.59|  17.10|  54.86|    32.04|    17.94| 250.89| 17.6|38655 |  648.0|
|AMB1 |      10|H7  |1   |AMB1_H7   |   1|     1|      2.87|    1.56|  16.60|  50.27|    28.42|    17.12| 206.30| 16.8|33742 |  608.4|
|AMB1 |      11|H8  |1   |AMB1_H8   |   1|     1|      2.59|    1.30|  12.74|  51.03|    30.03|    14.14| 184.87| 18.8|31286 |  597.8|
|AMB1 |      12|H9  |1   |AMB1_H9   |   1|     1|      3.00|    1.71|  12.24|  51.78|    31.58|    15.06| 182.83| 14.4|41002 |  445.4|
|AMB1 |      13|H10 |2   |AMB1_H10  |   1|     2|      2.79|    1.71|  14.90|  52.73|    32.03|    15.48| 176.43| 17.6|34688 |  502.4|
|AMB1 |      14|H11 |2   |AMB1_H11  |   1|     2|      2.72|    1.56|  16.70|  47.21|    28.69|    17.20| 181.28| 13.6|36066 |  500.8|
|AMB1 |      15|H12 |2   |AMB1_H12  |   1|     2|      2.56|    1.56|  15.68|  49.86|    29.85|    16.16| 187.96| 17.2|32833 |  585.8|


# Dividir/juntar conjunto de dados

```r
df_list <- split_factors(df_tidy, ENV)
df_list
## $AMB1
## # A tibble: 36 x 12
##    GEN   BLOCO ALT_PLANT ALT_ESP COMPES DIAMES COMP_SAB DIAM_SAB   MGE  NFIL
##    <chr> <dbl>     <dbl>   <dbl>  <dbl>  <dbl>    <dbl>    <dbl> <dbl> <dbl>
##  1 H10       1      0       1.64   16.7   54.0     31.7     17.4  194.  15.6
##  2 H10       2      2.79    1.71   14.9   52.7     32.0     15.5  176.  17.6
##  3 H10       3      2.72    1.51   16.7   52.7     30.4     17.5  207.  16.8
##  4 H11       1      2.75    1.51   17.4   51.7     30.6     18.0  217.  16.8
##  5 H11       2      2.72    1.56   16.7   47.2     28.7     17.2  181.  13.6
##  6 H11       3      2.77    1.67   15.8   47.9     27.6     16.4  166.  15.2
##  7 H12       1      2.73    1.54   14.9   47.5     28.2     15.5  161.  14.8
##  8 H12       2      2.56    1.56   15.7   49.9     29.8     16.2  188.  17.2
##  9 H12       3      2.79    1.53   15.0   52.7     31.4     15.2  193.  20  
## 10 H13       1      2.74    1.6    14.6   54       32.5     15.1  205.  20  
## # ... with 26 more rows, and 2 more variables: MMG <chr>, NGE <dbl>
## 
## $AMB2
## # A tibble: 39 x 12
##    GEN   BLOCO ALT_PLANT ALT_ESP COMPES DIAMES COMP_SAB DIAM_SAB   MGE  NFIL
##    <chr> <dbl>     <dbl>   <dbl>  <dbl>  <dbl>    <dbl>    <dbl> <dbl> <dbl>
##  1 H1        1      3       1.88   15.1   50.8     31.1     15.6  191.  16.4
##  2 H1        2      2.97    1.83   15.2   52.1     31.2     15.7  197.  17.2
##  3 H1        3      2.81    1.67   14.6   52.7     32.2     15.1  177.  17.6
##  4 H10       1      2.1     0.91   16.0   46.7     27.2     17.1  151.  15.2
##  5 H10       2      2.12    1.03   14.6   46.4     26.6     15.5  152.  13.2
##  6 H10       3      1.92    1.02   16.0   47.1     26.6     16.3  177.  13.6
##  7 H11       1      2.13    1.05   14.8   47.0     27.0     15.9  169.  13.2
##  8 H11       2      2.13    1.01   16.0   47.7     28.0     16.3  168.  14  
##  9 H11       3      2.18    0.99   14.6   47.3     26.7     14.8  153.  14  
## 10 H12       1      2.15    0.98   14.3   45.3     25.7     14.8  138.  13.6
## # ... with 29 more rows, and 2 more variables: MMG <chr>, NGE <dbl>
## 
## $AMB3
## # A tibble: 39 x 12
##    GEN   BLOCO ALT_PLANT ALT_ESP COMPES DIAMES COMP_SAB DIAM_SAB   MGE  NFIL
##    <chr> <dbl>     <dbl>   <dbl>  <dbl>  <dbl>    <dbl>    <dbl> <dbl> <dbl>
##  1 H1        1      2.11    1.05   15.7   49.9     30.5     16.6  164.  15.6
##  2 H1        2      2.2     1.09   13.7   49.2     30.5     14.7  130.  16.4
##  3 H1        3      2.29    1.15   15.1   52.6     31.7     16.2  176   15.6
##  4 H10       1      1.79    0.89   13.9   44.1     26.2     15.0  116.  14.8
##  5 H10       2      2.05    1.03   13.6   43.9     23.5     14.4  118.  16  
##  6 H10       3      2.27    1.11   14.5   43.7     24.6     16.1  128.  15.2
##  7 H11       1      1.71    0.81   15.5   45.2     25.0     16.7  140.  15.6
##  8 H11       2      2.09    1.06   12.2   46.9     26.5     14.3  114.  16.8
##  9 H11       3      2.5     1.44   15.0   49.0     27.5     15.2  168.  16.4
## 10 H12       1      2.52    1.52   14.4   49.2     28.4     15    153.  16.4
## # ... with 29 more rows, and 2 more variables: MMG <chr>, NGE <dbl>
## 
## attr(,"ptype")
## # A tibble: 0 x 12
## # ... with 12 variables: GEN <chr>, BLOCO <dbl>, ALT_PLANT <dbl>,
## #   ALT_ESP <dbl>, COMPES <dbl>, DIAMES <dbl>, COMP_SAB <dbl>, DIAM_SAB <dbl>,
## #   MGE <dbl>, NFIL <dbl>, MMG <chr>, NGE <dbl>
## attr(,"class")
## [1] "split_factors"
rbind_fill_id(df_list, .id = "AMBIENTE")
## # A tibble: 114 x 13
##    AMBIENTE GEN   BLOCO ALT_PLANT ALT_ESP COMPES DIAMES COMP_SAB DIAM_SAB   MGE
##    <chr>    <chr> <dbl>     <dbl>   <dbl>  <dbl>  <dbl>    <dbl>    <dbl> <dbl>
##  1 AMB1     H10       1      0       1.64   16.7   54.0     31.7     17.4  194.
##  2 AMB1     H10       2      2.79    1.71   14.9   52.7     32.0     15.5  176.
##  3 AMB1     H10       3      2.72    1.51   16.7   52.7     30.4     17.5  207.
##  4 AMB1     H11       1      2.75    1.51   17.4   51.7     30.6     18.0  217.
##  5 AMB1     H11       2      2.72    1.56   16.7   47.2     28.7     17.2  181.
##  6 AMB1     H11       3      2.77    1.67   15.8   47.9     27.6     16.4  166.
##  7 AMB1     H12       1      2.73    1.54   14.9   47.5     28.2     15.5  161.
##  8 AMB1     H12       2      2.56    1.56   15.7   49.9     29.8     16.2  188.
##  9 AMB1     H12       3      2.79    1.53   15.0   52.7     31.4     15.2  193.
## 10 AMB1     H13       1      2.74    1.6    14.6   54       32.5     15.1  205.
## # ... with 104 more rows, and 3 more variables: NFIL <dbl>, MMG <chr>,
## #   NGE <dbl>
```


# Tabela bidirecional

```r
# Cria uma tabela bidirecional
tab <- make_mat(df_tidy,
                row = GEN,
                col = ENV,
                value = NGE)
print_tbl(tab)
```



|    |    AMB2|    AMB3|     AMB1|
|:---|-------:|-------:|--------:|
|H1  | 484.400| 425.133|       NA|
|H10 | 510.600| 488.800|  515.400|
|H11 | 478.000| 487.733|  512.733|
|H12 | 424.000| 516.867|  553.333|
|H13 | 522.867| 578.867|  611.067|
|H2  | 531.400| 466.333|  621.733|
|H3  | 474.533| 421.000|  609.867|
|H4  | 510.467| 474.200|  604.400|
|H5  | 560.400| 536.467| 2129.400|
|H6  | 621.733| 419.533|  568.533|
|H7  | 487.067| 440.667|  544.000|
|H8  | 476.733| 407.333|  541.800|
|H9  | 478.267| 419.733|  488.533|

```r


# máximo valor observado
tab2 <- make_mat(df_tidy,
                row = GEN,
                col = ENV,
                value = NGE,
                fun = max)
print_tbl(tab2)
```



|    |  AMB2|  AMB3|   AMB1|
|:---|-----:|-----:|------:|
|H1  | 506.2| 458.4|     NA|
|H10 | 541.8| 524.4|  524.6|
|H11 | 521.2| 534.6|  524.6|
|H12 | 480.2| 532.2|  594.0|
|H13 | 583.0| 667.8|  693.2|
|H2  | 556.4| 478.0|  696.6|
|H3  | 506.6| 483.0|  641.6|
|H4  | 564.4| 510.4|  637.4|
|H5  | 586.4| 591.4| 5302.0|
|H6  | 674.4| 436.4|  648.0|
|H7  | 528.0| 478.4|  608.4|
|H8  | 493.6| 434.8|  597.8|
|H9  | 538.8| 486.0|  510.4|

```r

# soma de linhas e colunas
row_col_sum(tab) %>% print_tbl()
## Warning: NA values removed to compute the function. Use 'na.rm = TRUE' to
## suppress this warning.
## To remove rows with NA use `remove_rows_na()'. 
## To remove columns with NA use `remove_cols_na()'.
```



|         |     AMB2|     AMB3|     AMB1|  row_sums|
|:--------|--------:|--------:|--------:|---------:|
|H1       |  484.400|  425.133|       NA|   909.533|
|H10      |  510.600|  488.800|  515.400|  1514.800|
|H11      |  478.000|  487.733|  512.733|  1478.467|
|H12      |  424.000|  516.867|  553.333|  1494.200|
|H13      |  522.867|  578.867|  611.067|  1712.800|
|H2       |  531.400|  466.333|  621.733|  1619.467|
|H3       |  474.533|  421.000|  609.867|  1505.400|
|H4       |  510.467|  474.200|  604.400|  1589.067|
|H5       |  560.400|  536.467| 2129.400|  3226.267|
|H6       |  621.733|  419.533|  568.533|  1609.800|
|H7       |  487.067|  440.667|  544.000|  1471.733|
|H8       |  476.733|  407.333|  541.800|  1425.867|
|H9       |  478.267|  419.733|  488.533|  1386.533|
|col_sums | 6560.467| 6082.667| 8300.800| 20943.933|

```r

# média de linhas e colunas
row_col_mean(tab) %>% print_tbl()
## Warning: NA values removed to compute the function. Use 'na.rm = TRUE' to
## suppress this warning.
## To remove rows with NA use `remove_rows_na()'. 
## To remove columns with NA use `remove_cols_na()'.
```



|          |    AMB2|    AMB3|     AMB1| row_means|
|:---------|-------:|-------:|--------:|---------:|
|H1        | 484.400| 425.133|       NA|   454.767|
|H10       | 510.600| 488.800|  515.400|   504.933|
|H11       | 478.000| 487.733|  512.733|   492.822|
|H12       | 424.000| 516.867|  553.333|   498.067|
|H13       | 522.867| 578.867|  611.067|   570.933|
|H2        | 531.400| 466.333|  621.733|   539.822|
|H3        | 474.533| 421.000|  609.867|   501.800|
|H4        | 510.467| 474.200|  604.400|   529.689|
|H5        | 560.400| 536.467| 2129.400|  1075.422|
|H6        | 621.733| 419.533|  568.533|   536.600|
|H7        | 487.067| 440.667|  544.000|   490.578|
|H8        | 476.733| 407.333|  541.800|   475.289|
|H9        | 478.267| 419.733|  488.533|   462.178|
|col_means | 504.651| 467.897|  691.733|   551.156|


# Utilitários para zero e `NAs`

NAs e zeros podem aumentar o ruído na análise de dados. O pacote `metan` possui uma coleção de funções que facilitarão a tarefa de lidar com zeros e valores `NA`.



```r
# Dados "bagunçados"
df_messy <- import("http://bit.ly/df_messy", setclass = "tbl") %>% head(20)

```


## Remover ou substituir `NA`s

```r

# checar para ver se tem NA
has_na(df_messy)
## [1] TRUE

# remover colunas com NA
remove_cols_na(df_messy) %>% print_tbl()
```



| BLOCO| Alt plant| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |
|-----:|---------:|-------:|------:|------:|-------:|-------:|------:|----:|:------|
|     1|      0.00|    1.64|  16.72|  54.05|   31.66|   17.40| 193.69| 15.6|379.61 |
|     2|      2.79|    1.71|  14.90|  52.73|   32.03|   15.48| 176.43| 17.6|346.88 |
|     3|      2.72|    1.51|  16.68|  52.74|   30.40|   17.50| 207.11| 16.8|394.03 |
|     1|      2.75|    1.51|  17.42|  51.69|   30.64|   17.98| 217.29| 16.8|376.65 |
|     2|      2.72|    1.56|  16.70|  47.21|   28.69|   17.20| 181.28| 13.6|360.66 |
|     3|      2.77|    1.67|  15.78|  47.87|   27.63|   16.36| 166.19| 15.2|321.8  |
|     1|      2.73|    1.54|  14.88|  47.51|   28.22|   15.54| 160.98| 14.8|344.84 |
|     2|      2.56|    1.56|  15.68|  49.86|   29.85|   16.16| 187.96| 17.2|328.33 |
|     3|      2.79|    1.53|  14.98|  52.67|   31.38|   15.24| 192.51| 20.0|325.36 |
|     1|      2.74|    1.60|  14.64|  54.00|   32.48|   15.06| 205.34| 20.0|334.37 |
|     2|      2.64|    1.37|  14.80|  53.73|   30.97|   15.54| 238.55| 20.4|348.72 |
|     3|      2.93|    1.77|  14.92|  52.66|   30.07|   15.76| 211.92| 15.6|421.23 |
|     1|      2.55|    1.22|  15.08|  51.66|   27.71|   15.30| 197.70| 16.4|382.06 |
|     2|      2.90|    1.41|  15.12|  51.53|   26.04|   16.00| 212.18| 21.2|304.51 |
|     3|      2.92|    1.39|  14.78|  52.63|   26.04|   15.14| 201.62| 20.0|300.02 |
|     1|      3.04|    1.43|  15.02|  51.66|   25.93|   16.56| 209.80| 19.6|317.48 |
|     2|      2.94|    1.66|  14.88|  51.46|   31.33|   15.46| 192.84| 18.0|345.83 |
|     3|      2.82|    1.67|  16.46|  52.25|   26.74|   17.08| 191.99| 18.0|311.73 |
|     1|      3.02|    1.82|  16.54|  50.43|   27.31|   17.26| 193.02| 16.8|305.33 |
|     2|      2.84|    1.69|  15.04|  52.17|   27.95|   15.72| 215.69| 18.4|357.3  |

```r

# remover linhas com NA
remove_rows_na(df_messy) %>% print_tbl()
```



|env   |Gen | BLOCO| Alt plant| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |   NGE|
|:-----|:---|-----:|---------:|-------:|------:|------:|-------:|-------:|------:|----:|:------|-----:|
|Amb 1 |H10 |     1|         0|    1.64|  16.72|  54.05|   31.66|    17.4| 193.69| 15.6|379.61 | 519.2|

```r

# selecionar colunas com NA
select_cols_na(df_messy) %>% print_tbl()
```



|env   |Gen |   NGE|
|:-----|:---|-----:|
|Amb 1 |H10 | 519.2|
|NA    |NA  | 502.4|
|NA    |NA  | 524.6|
|NA    |H11 |    NA|
|NA    |NA  | 500.8|
|NA    |NA  | 512.8|
|NA    |H12 | 480.2|
|NA    |NA  | 585.8|
|NA    |NA  | 594.0|
|NA    |H13 | 628.4|
|NA    |NA  | 693.2|
|NA    |NA  | 511.6|
|NA    |H2  | 518.2|
|NA    |NA  | 696.6|
|NA    |NA  | 650.4|
|NA    |H3  | 641.6|
|NA    |NA  | 550.6|
|NA    |NA  | 637.4|
|NA    |H4  |    NA|
|NA    |NA  | 613.6|

```r

# selecionar colunas com NA
select_rows_na(df_messy) %>% print_tbl()
```



|env |Gen | BLOCO| Alt plant| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |   NGE|
|:---|:---|-----:|---------:|-------:|------:|------:|-------:|-------:|------:|----:|:------|-----:|
|NA  |NA  |     2|      2.79|    1.71|  14.90|  52.73|   32.03|   15.48| 176.43| 17.6|346.88 | 502.4|
|NA  |NA  |     3|      2.72|    1.51|  16.68|  52.74|   30.40|   17.50| 207.11| 16.8|394.03 | 524.6|
|NA  |H11 |     1|      2.75|    1.51|  17.42|  51.69|   30.64|   17.98| 217.29| 16.8|376.65 |    NA|
|NA  |NA  |     2|      2.72|    1.56|  16.70|  47.21|   28.69|   17.20| 181.28| 13.6|360.66 | 500.8|
|NA  |NA  |     3|      2.77|    1.67|  15.78|  47.87|   27.63|   16.36| 166.19| 15.2|321.8  | 512.8|
|NA  |H12 |     1|      2.73|    1.54|  14.88|  47.51|   28.22|   15.54| 160.98| 14.8|344.84 | 480.2|
|NA  |NA  |     2|      2.56|    1.56|  15.68|  49.86|   29.85|   16.16| 187.96| 17.2|328.33 | 585.8|
|NA  |NA  |     3|      2.79|    1.53|  14.98|  52.67|   31.38|   15.24| 192.51| 20.0|325.36 | 594.0|
|NA  |H13 |     1|      2.74|    1.60|  14.64|  54.00|   32.48|   15.06| 205.34| 20.0|334.37 | 628.4|
|NA  |NA  |     2|      2.64|    1.37|  14.80|  53.73|   30.97|   15.54| 238.55| 20.4|348.72 | 693.2|
|NA  |NA  |     3|      2.93|    1.77|  14.92|  52.66|   30.07|   15.76| 211.92| 15.6|421.23 | 511.6|
|NA  |H2  |     1|      2.55|    1.22|  15.08|  51.66|   27.71|   15.30| 197.70| 16.4|382.06 | 518.2|
|NA  |NA  |     2|      2.90|    1.41|  15.12|  51.53|   26.04|   16.00| 212.18| 21.2|304.51 | 696.6|
|NA  |NA  |     3|      2.92|    1.39|  14.78|  52.63|   26.04|   15.14| 201.62| 20.0|300.02 | 650.4|
|NA  |H3  |     1|      3.04|    1.43|  15.02|  51.66|   25.93|   16.56| 209.80| 19.6|317.48 | 641.6|
|NA  |NA  |     2|      2.94|    1.66|  14.88|  51.46|   31.33|   15.46| 192.84| 18.0|345.83 | 550.6|
|NA  |NA  |     3|      2.82|    1.67|  16.46|  52.25|   26.74|   17.08| 191.99| 18.0|311.73 | 637.4|
|NA  |H4  |     1|      3.02|    1.82|  16.54|  50.43|   27.31|   17.26| 193.02| 16.8|305.33 |    NA|
|NA  |NA  |     2|      2.84|    1.69|  15.04|  52.17|   27.95|   15.72| 215.69| 18.4|357.3  | 613.6|

```r

# substituir NA por um valor
replace_na(df_messy, replacement = "FALTA")
## # A tibble: 20 x 13
##    env   Gen   BLOCO `Alt plant` `Alt Esp` COMPES DIAMES CompSab DiamSab   Mge
##    <chr> <chr> <dbl>       <dbl>     <dbl>  <dbl>  <dbl>   <dbl>   <dbl> <dbl>
##  1 Amb 1 H10       1        0         1.64   16.7   54.0    31.7    17.4  194.
##  2 FALTA FALTA     2        2.79      1.71   14.9   52.7    32.0    15.5  176.
##  3 FALTA FALTA     3        2.72      1.51   16.7   52.7    30.4    17.5  207.
##  4 FALTA H11       1        2.75      1.51   17.4   51.7    30.6    18.0  217.
##  5 FALTA FALTA     2        2.72      1.56   16.7   47.2    28.7    17.2  181.
##  6 FALTA FALTA     3        2.77      1.67   15.8   47.9    27.6    16.4  166.
##  7 FALTA H12       1        2.73      1.54   14.9   47.5    28.2    15.5  161.
##  8 FALTA FALTA     2        2.56      1.56   15.7   49.9    29.8    16.2  188.
##  9 FALTA FALTA     3        2.79      1.53   15.0   52.7    31.4    15.2  193.
## 10 FALTA H13       1        2.74      1.6    14.6   54      32.5    15.1  205.
## 11 FALTA FALTA     2        2.64      1.37   14.8   53.7    31.0    15.5  239.
## 12 FALTA FALTA     3        2.93      1.77   14.9   52.7    30.1    15.8  212.
## 13 FALTA H2        1        2.55      1.22   15.1   51.7    27.7    15.3  198.
## 14 FALTA FALTA     2        2.9       1.41   15.1   51.5    26.0    16    212.
## 15 FALTA FALTA     3        2.92      1.39   14.8   52.6    26.0    15.1  202.
## 16 FALTA H3        1        3.04      1.43   15.0   51.7    25.9    16.6  210.
## 17 FALTA FALTA     2        2.94      1.66   14.9   51.5    31.3    15.5  193.
## 18 FALTA FALTA     3        2.82      1.67   16.5   52.2    26.7    17.1  192.
## 19 FALTA H4        1        3.02      1.82   16.5   50.4    27.3    17.3  193.
## 20 FALTA FALTA     2        2.84      1.69   15.0   52.2    28.0    15.7  216.
## # ... with 3 more variables: Nfil <dbl>, MMG <chr>, NGE <chr>
```






## Remover ou substituir zeros

```r

# checar para ver se tem NA
has_zero(df_messy)
## [1] TRUE

# remover colunas com NA
remove_cols_zero(df_messy) %>% print_tbl()
```



|env   |Gen | BLOCO| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |   NGE|
|:-----|:---|-----:|-------:|------:|------:|-------:|-------:|------:|----:|:------|-----:|
|Amb 1 |H10 |     1|    1.64|  16.72|  54.05|   31.66|   17.40| 193.69| 15.6|379.61 | 519.2|
|NA    |NA  |     2|    1.71|  14.90|  52.73|   32.03|   15.48| 176.43| 17.6|346.88 | 502.4|
|NA    |NA  |     3|    1.51|  16.68|  52.74|   30.40|   17.50| 207.11| 16.8|394.03 | 524.6|
|NA    |H11 |     1|    1.51|  17.42|  51.69|   30.64|   17.98| 217.29| 16.8|376.65 |    NA|
|NA    |NA  |     2|    1.56|  16.70|  47.21|   28.69|   17.20| 181.28| 13.6|360.66 | 500.8|
|NA    |NA  |     3|    1.67|  15.78|  47.87|   27.63|   16.36| 166.19| 15.2|321.8  | 512.8|
|NA    |H12 |     1|    1.54|  14.88|  47.51|   28.22|   15.54| 160.98| 14.8|344.84 | 480.2|
|NA    |NA  |     2|    1.56|  15.68|  49.86|   29.85|   16.16| 187.96| 17.2|328.33 | 585.8|
|NA    |NA  |     3|    1.53|  14.98|  52.67|   31.38|   15.24| 192.51| 20.0|325.36 | 594.0|
|NA    |H13 |     1|    1.60|  14.64|  54.00|   32.48|   15.06| 205.34| 20.0|334.37 | 628.4|
|NA    |NA  |     2|    1.37|  14.80|  53.73|   30.97|   15.54| 238.55| 20.4|348.72 | 693.2|
|NA    |NA  |     3|    1.77|  14.92|  52.66|   30.07|   15.76| 211.92| 15.6|421.23 | 511.6|
|NA    |H2  |     1|    1.22|  15.08|  51.66|   27.71|   15.30| 197.70| 16.4|382.06 | 518.2|
|NA    |NA  |     2|    1.41|  15.12|  51.53|   26.04|   16.00| 212.18| 21.2|304.51 | 696.6|
|NA    |NA  |     3|    1.39|  14.78|  52.63|   26.04|   15.14| 201.62| 20.0|300.02 | 650.4|
|NA    |H3  |     1|    1.43|  15.02|  51.66|   25.93|   16.56| 209.80| 19.6|317.48 | 641.6|
|NA    |NA  |     2|    1.66|  14.88|  51.46|   31.33|   15.46| 192.84| 18.0|345.83 | 550.6|
|NA    |NA  |     3|    1.67|  16.46|  52.25|   26.74|   17.08| 191.99| 18.0|311.73 | 637.4|
|NA    |H4  |     1|    1.82|  16.54|  50.43|   27.31|   17.26| 193.02| 16.8|305.33 |    NA|
|NA    |NA  |     2|    1.69|  15.04|  52.17|   27.95|   15.72| 215.69| 18.4|357.3  | 613.6|

```r

# remover linhas com NA
remove_rows_zero(df_messy) %>% print_tbl()
```



|env |Gen | BLOCO| Alt plant| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |   NGE|
|:---|:---|-----:|---------:|-------:|------:|------:|-------:|-------:|------:|----:|:------|-----:|
|NA  |NA  |     2|      2.79|    1.71|  14.90|  52.73|   32.03|   15.48| 176.43| 17.6|346.88 | 502.4|
|NA  |NA  |     3|      2.72|    1.51|  16.68|  52.74|   30.40|   17.50| 207.11| 16.8|394.03 | 524.6|
|NA  |H11 |     1|      2.75|    1.51|  17.42|  51.69|   30.64|   17.98| 217.29| 16.8|376.65 |    NA|
|NA  |NA  |     2|      2.72|    1.56|  16.70|  47.21|   28.69|   17.20| 181.28| 13.6|360.66 | 500.8|
|NA  |NA  |     3|      2.77|    1.67|  15.78|  47.87|   27.63|   16.36| 166.19| 15.2|321.8  | 512.8|
|NA  |H12 |     1|      2.73|    1.54|  14.88|  47.51|   28.22|   15.54| 160.98| 14.8|344.84 | 480.2|
|NA  |NA  |     2|      2.56|    1.56|  15.68|  49.86|   29.85|   16.16| 187.96| 17.2|328.33 | 585.8|
|NA  |NA  |     3|      2.79|    1.53|  14.98|  52.67|   31.38|   15.24| 192.51| 20.0|325.36 | 594.0|
|NA  |H13 |     1|      2.74|    1.60|  14.64|  54.00|   32.48|   15.06| 205.34| 20.0|334.37 | 628.4|
|NA  |NA  |     2|      2.64|    1.37|  14.80|  53.73|   30.97|   15.54| 238.55| 20.4|348.72 | 693.2|
|NA  |NA  |     3|      2.93|    1.77|  14.92|  52.66|   30.07|   15.76| 211.92| 15.6|421.23 | 511.6|
|NA  |H2  |     1|      2.55|    1.22|  15.08|  51.66|   27.71|   15.30| 197.70| 16.4|382.06 | 518.2|
|NA  |NA  |     2|      2.90|    1.41|  15.12|  51.53|   26.04|   16.00| 212.18| 21.2|304.51 | 696.6|
|NA  |NA  |     3|      2.92|    1.39|  14.78|  52.63|   26.04|   15.14| 201.62| 20.0|300.02 | 650.4|
|NA  |H3  |     1|      3.04|    1.43|  15.02|  51.66|   25.93|   16.56| 209.80| 19.6|317.48 | 641.6|
|NA  |NA  |     2|      2.94|    1.66|  14.88|  51.46|   31.33|   15.46| 192.84| 18.0|345.83 | 550.6|
|NA  |NA  |     3|      2.82|    1.67|  16.46|  52.25|   26.74|   17.08| 191.99| 18.0|311.73 | 637.4|
|NA  |H4  |     1|      3.02|    1.82|  16.54|  50.43|   27.31|   17.26| 193.02| 16.8|305.33 |    NA|
|NA  |NA  |     2|      2.84|    1.69|  15.04|  52.17|   27.95|   15.72| 215.69| 18.4|357.3  | 613.6|

```r

# selecionar colunas com NA
select_cols_zero(df_messy) %>% print_tbl()
```



| Alt plant|
|---------:|
|      0.00|
|      2.79|
|      2.72|
|      2.75|
|      2.72|
|      2.77|
|      2.73|
|      2.56|
|      2.79|
|      2.74|
|      2.64|
|      2.93|
|      2.55|
|      2.90|
|      2.92|
|      3.04|
|      2.94|
|      2.82|
|      3.02|
|      2.84|

```r

# selecionar colunas com NA
select_rows_zero(df_messy) %>% print_tbl()
```



|env   |Gen | BLOCO| Alt plant| Alt Esp| COMPES| DIAMES| CompSab| DiamSab|    Mge| Nfil|MMG    |   NGE|
|:-----|:---|-----:|---------:|-------:|------:|------:|-------:|-------:|------:|----:|:------|-----:|
|Amb 1 |H10 |     1|         0|    1.64|  16.72|  54.05|   31.66|    17.4| 193.69| 15.6|379.61 | 519.2|

```r

# substituir NA por um valor
replace_zero(df_messy, replacement = NA) # padrão
## # A tibble: 20 x 13
##    env   Gen   BLOCO `Alt plant` `Alt Esp` COMPES DIAMES CompSab DiamSab   Mge
##    <chr> <chr> <dbl>       <dbl>     <dbl>  <dbl>  <dbl>   <dbl>   <dbl> <dbl>
##  1 Amb 1 H10       1       NA         1.64   16.7   54.0    31.7    17.4  194.
##  2 <NA>  <NA>      2        2.79      1.71   14.9   52.7    32.0    15.5  176.
##  3 <NA>  <NA>      3        2.72      1.51   16.7   52.7    30.4    17.5  207.
##  4 <NA>  H11       1        2.75      1.51   17.4   51.7    30.6    18.0  217.
##  5 <NA>  <NA>      2        2.72      1.56   16.7   47.2    28.7    17.2  181.
##  6 <NA>  <NA>      3        2.77      1.67   15.8   47.9    27.6    16.4  166.
##  7 <NA>  H12       1        2.73      1.54   14.9   47.5    28.2    15.5  161.
##  8 <NA>  <NA>      2        2.56      1.56   15.7   49.9    29.8    16.2  188.
##  9 <NA>  <NA>      3        2.79      1.53   15.0   52.7    31.4    15.2  193.
## 10 <NA>  H13       1        2.74      1.6    14.6   54      32.5    15.1  205.
## 11 <NA>  <NA>      2        2.64      1.37   14.8   53.7    31.0    15.5  239.
## 12 <NA>  <NA>      3        2.93      1.77   14.9   52.7    30.1    15.8  212.
## 13 <NA>  H2        1        2.55      1.22   15.1   51.7    27.7    15.3  198.
## 14 <NA>  <NA>      2        2.9       1.41   15.1   51.5    26.0    16    212.
## 15 <NA>  <NA>      3        2.92      1.39   14.8   52.6    26.0    15.1  202.
## 16 <NA>  H3        1        3.04      1.43   15.0   51.7    25.9    16.6  210.
## 17 <NA>  <NA>      2        2.94      1.66   14.9   51.5    31.3    15.5  193.
## 18 <NA>  <NA>      3        2.82      1.67   16.5   52.2    26.7    17.1  192.
## 19 <NA>  H4        1        3.02      1.82   16.5   50.4    27.3    17.3  193.
## 20 <NA>  <NA>      2        2.84      1.69   15.0   52.2    28.0    15.7  216.
## # ... with 3 more variables: Nfil <dbl>, MMG <chr>, NGE <dbl>
```






