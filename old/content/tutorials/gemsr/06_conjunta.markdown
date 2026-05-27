---
title: ANOVA - conjunta
linktitle: "6. ANOVA - conjunta"
type: docs
toc: true
keep_md: yes
menu:
  gemsr:
    parent: GEMS-R
    weight: 6
weight: 6    
---

<script type="text/javascript" src="http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML" ></script>



# Anova conjunta - modelo fixo


```r
library(metan)
library(rio)

# gerar tabelas html
print_tbl <- function(table, digits = 3, ...){
  knitr::kable(table, booktabs = TRUE, digits = digits, ...)
}


df_ge <- import("http://bit.ly/df_ge", setclass = "tbl")
inspect(df_ge, verbose = FALSE) %>% print_tbl()
```



|Variable  |Class     |Missing |Levels | Valid_n|    Min| Median|    Max| Outlier|
|:---------|:---------|:-------|:------|-------:|------:|------:|------:|-------:|
|ENV       |character |No      |0      |     156|     NA|     NA|     NA|      NA|
|GEN       |character |No      |0      |     156|     NA|     NA|     NA|      NA|
|BLOCO     |character |No      |0      |     156|     NA|     NA|     NA|      NA|
|ALT_PLANT |numeric   |No      |-      |     156|   1.71|   2.52|   3.04|       0|
|ALT_ESP   |numeric   |No      |-      |     156|   0.75|   1.41|   1.88|       0|
|COMPES    |numeric   |No      |-      |     156|  11.50|  15.13|  17.94|       1|
|DIAMES    |numeric   |No      |-      |     156|  43.48|  49.95|  54.86|       0|
|COMP_SAB  |numeric   |No      |-      |     156|  23.49|  28.67|  34.66|       0|
|DIAM_SAB  |numeric   |No      |-      |     156|  12.90|  16.00|  18.56|       0|
|MGE       |numeric   |No      |-      |     156| 105.72| 174.63| 250.89|       0|
|NFIL      |numeric   |No      |-      |     156|  12.40|  16.00|  21.20|       1|
|MMG       |numeric   |No      |-      |     156| 218.32| 342.07| 451.68|       1|
|NGE       |numeric   |No      |-      |     156| 331.80| 509.20| 696.60|       3|

```r

joint_an <- 
    anova_joint(df_ge,
                env = ENV, 
                gen = GEN,
                rep = BLOCO,
                resp = everything(), 
                verbose = FALSE)
```

# Anova conjunta - modelo misto
## O modelo
O modelo linear mais simples e conhecido com efeito de interação usado para analisar dados em multi-ambientes é:

$$
{y_{ijk}} = {\rm {}} \mu {\rm {}} + \mathop \alpha \nolimits_i + \mathop \tau \nolimits_j + \mathop {(\alpha \tau)} \nolimits_{ij } + \mathop \gamma \nolimits_{jk} + {\rm {}} \mathop \varepsilon \nolimits_{ijk}
$$

onde \\(y_{ijk}\\) é a variável resposta (por exemplo, rendimento de grãos) observada no \\(k\\)-ésimo bloco do \\(i\\)-ésimo genótipo no \\(j\\)-ésimo ambiente (\\(i\\) = 1, 2, ..., \\(g\\); \\(j\\) = 1, 2, ..., \\(e\\); \\(k\\) = 1, 2, ..., \\(b\\)); \\(\mu\\) é a média geral; \\(\mathop \alpha \nolimits_i\\) é o efeito do \\(i\\)-ésimo genótipo; \\(\mathop \tau \nolimits_j\\) é o efeito do \\(j\\)-ésimo; \\(\mathop {(\alpha \tau)} \nolimits_{ij}\\) é o efeito de interação do \\(i\\)-ésimo genótipo com o \\(j\\)-ésimo ambiente; \\(\mathop \gamma \nolimits_{jk}\\) é o efeito do \\(k\\)-ésimo bloco dentro do \\(j\\)-ésimo ambiente; e \\(\mathop \varepsilon \nolimits_{ijk}\\) é o erro aleatório. Em um modelo de efeito misto assumindo \\({\alpha_i}\\) e \\(\mathop {(\alpha \tau)} \nolimits_{ij}\\) como efeitos aleatórios, o modelo acima pode ser reescrito como:

$$
{\bf {y = X b + Zu + \varepsilon}}
$$


onde **y** é um vetor \\(n [= \sum \nolimits_{j = 1} ^ e {(gb)]} \times 1\\) da variável de resposta \\({\bf{y}} = {\rm{ }}{\left[ {{y_{111}},{\rm{ }}{y_{112}},{\rm{ }} \ldots ,{\rm{ }}{y_{geb}}} \right]^\prime }\\); \\(\bf{b}\\) é um vetor \\((eb) \times 1\\) de efeitos fixos desconhecidos \\({\bf{b}} = [\mathop \gamma \nolimits_{11}, \mathop \gamma \nolimits_{12}, ..., \mathop \gamma \nolimits_{eb}]^\prime\\); \\(\bf{u}\\) é um vetor \\(m \[= g + ge\] \times 1\\) de efeitos aleatórios \\({\bf {u}} = {\rm {}} {\left [{{\alpha_1}, { \alpha_2}, ..., {\alpha_g}, \mathop {(\alpha \tau)} \nolimits_{11}, \mathop {(\alpha \tau)} \nolimits_{12}, ... , \mathop {(\alpha \tau)} \nolimits_{ge}} \right] ^ \prime}\\); \\(\bf{X}\\) é uma matriz de design \\(n \times (eb)\\) relacionando \\(\bf{y}\\) a \\(\bf{b}\\); \\(\bf{Z}\\) é uma matriz de design \\(n\times m\\) relacionando \\(\bf{y}\\) a \\(\bf{u}\\); \\({\bf {\varepsilon}}\\) é um vetor \\(n \times 1\\) de erros aleatórios \\({\bf {\varepsilon}} = {\rm {}} {\left \[{{y\_{111}}, {\rm {}} {y\_{112}}, {\rm {}} \ldots, {\rm {}} {y\_{geb}}} \right\] ^ \prime}\\);

Os vetores \\(\bf{b}\\) e \\(\bf{u}\\) são estimados usando a conhecida equação de modelo misto[^1].


$$
\left[ {\begin{array}{*{20}{c}}{{\bf{\hat b }}}\\{{\bf{\hat u}}}\end{array}} \right]{\bf{ = }}{\left[ {\begin{array}{*{20}{c}}{{\bf{X'}}{{\bf{R }}^{ - {\bf{1}}}}{\bf{X}}}&{{\bf{X'}}{{\bf{R }}^{ - {\bf{1}}}}{\bf{Z}}}\\{{\bf{Z'}}{{\bf{R }}^{ - {\bf{1}}}}{\bf{X}}}&{{\bf{Z'}}{{\bf{R }}^{ - {\bf{1}}}}{\bf{Z + }}{{\bf{G}}^{ - {\bf{1}}}}}\end{array}} \right]^ - }\left[ {\begin{array}{*{20}{c}}{{\bf{X'}}{{\bf{R }}^{ - {\bf{1}}}}{\bf{y}}}\\{{\bf{Z'}}{{\bf{R }}^{ - {\bf{1}}}}{\bf{y}}}\end{array}} \right]
$$


onde **G** e **R** são as matrizes de variância-covariância para o vetor de efeito aleatório **u** e o vetor residual \\({\bf{\varepsilon }}\\), respectivamente.


## A função gamem_met()

A função `gamem_met()` é usada para ajustar o modelo linear de efeitos mistos. 


```r
args(gamem_met)
## function (.data, env, gen, rep, resp, block = NULL, by = NULL, 
##     random = "gen", prob = 0.05, verbose = TRUE) 
## NULL
```

O primeiro argumento são os dados, em nosso exemplo `df_ge`. Os argumentos (`env`, `gen` e `rep`) são os nomes das colunas que contêm os níveis de ambientes, genótipos e blocos, respectivamente. O argumento (`resp`) é a variável de resposta a ser analisada . A função permite uma única variável ou um vetor de variáveis resposta. Aqui, usaremos `everything()` para analisar todas as variáveis numéricas nos dados. Por padrão, o genótipo e a interação genótipo *vs* ambiente são considerados efeitos aleatórios. Outros efeitos podem ser considerados usando o argumento `random`. O último argumento (`verbose`) controla se o código é executado silenciosamente ou não.


```r
met_mixed <-
  gamem_met(df_ge,
            env = ENV,
            gen = GEN,
            rep = BLOCO,
            resp = everything(),
            random = "gen", #Default
            verbose = TRUE) #Padrão
## Evaluating trait ALT_PLANT |====                                 | 10% 00:00:00 
Evaluating trait ALT_ESP |========                               | 20% 00:00:00 
Evaluating trait COMPES |============                            | 30% 00:00:01 
Evaluating trait DIAMES |================                        | 40% 00:00:01 
Evaluating trait COMP_SAB |===================                   | 50% 00:00:01 
Evaluating trait DIAM_SAB |=======================               | 60% 00:00:02 
Evaluating trait MGE |==============================             | 70% 00:00:02 
Evaluating trait NFIL |==================================        | 80% 00:00:02 
Evaluating trait MMG |=======================================    | 90% 00:00:02 
Evaluating trait NGE |===========================================| 100% 00:00:03 
## Method: REML/BLUP
## Random effects: GEN, GEN:ENV
## Fixed effects: ENV, REP(ENV)
## Denominador DF: Satterthwaite's method
## ---------------------------------------------------------------------------
## P-values for Likelihood Ratio Test of the analyzed traits
## ---------------------------------------------------------------------------
##     model ALT_PLANT  ALT_ESP  COMPES   DIAMES COMP_SAB DIAM_SAB      MGE
##  COMPLETE        NA       NA      NA       NA       NA       NA       NA
##       GEN  9.39e-01 1.00e+00 1.00000 2.99e-01 1.00e+00 0.757438 6.21e-01
##   GEN:ENV  1.09e-13 8.12e-12 0.00103 1.69e-08 9.62e-17 0.000429 4.92e-07
##      NFIL      MMG     NGE
##        NA       NA      NA
##  1.00e+00 1.00e+00 1.00000
##  4.88e-05 4.21e-10 0.00101
## ---------------------------------------------------------------------------
## All variables with significant (p < 0.05) genotype-vs-environment interaction
```

## Gráfico de diagnóstico para resíduos

A função genérica S3 `plot()` é usada para gerar gráficos de diagnóstico de resíduos do modelo.


```r
plot(met_mixed)
## `geom_smooth()` using formula 'y ~ x'
## `geom_smooth()` using formula 'y ~ x'
```

<img src="/tutorials/gemsr/06_conjunta_files/figure-html/unnamed-chunk-4-1.png" width="672" />

A normalidade dos efeitos aleatórios de genótipo e efeitos de interação também podem ser obtidos usando `type =" re "`.


```r
plot(met_mixed, type = "re")
```

<img src="/tutorials/gemsr/06_conjunta_files/figure-html/unnamed-chunk-5-1.png" width="960" />

## LRT

A saída `LRT` contém os testes de razão de verossimilhança para genótipo e efeitos aleatórios genótipo versus ambiente. Podemos obter esses valores com `get_model_data()`


```r
lrt <- gmd(met_mixed, "lrt")
## Class of the model: waasb
## Variable extracted: lrt
print_tbl(lrt)
```



|VAR       |model   | npar|   logLik|      AIC|    LRT| Df| Pr(>Chisq)|
|:---------|:-------|----:|--------:|--------:|------:|--:|----------:|
|ALT_PLANT |GEN     |   14|    7.891|   12.217|  0.006|  1|      0.939|
|ALT_PLANT |GEN:ENV |   14|  -19.704|   67.408| 55.197|  1|      0.000|
|ALT_ESP   |GEN     |   14|   18.915|   -9.830|  0.000|  1|      1.000|
|ALT_ESP   |GEN:ENV |   14|   -4.454|   36.907| 46.737|  1|      0.000|
|COMPES    |GEN     |   14| -245.341|  518.682|  0.000|  1|      1.000|
|COMPES    |GEN:ENV |   14| -250.725|  529.450| 10.768|  1|      0.001|
|DIAMES    |GEN     |   14| -326.539|  681.079|  1.080|  1|      0.299|
|DIAMES    |GEN:ENV |   14| -341.911|  711.821| 31.822|  1|      0.000|
|COMP_SAB  |GEN     |   14| -304.156|  636.312|  0.000|  1|      1.000|
|COMP_SAB  |GEN:ENV |   14| -338.679|  705.358| 69.046|  1|      0.000|
|DIAM_SAB  |GEN     |   14| -235.350|  498.699|  0.095|  1|      0.757|
|DIAM_SAB  |GEN:ENV |   14| -241.503|  511.006| 12.402|  1|      0.000|
|MGE       |GEN     |   14| -681.320| 1390.640|  0.244|  1|      0.621|
|MGE       |GEN:ENV |   14| -693.846| 1415.691| 25.296|  1|      0.000|
|NFIL      |GEN     |   14| -279.799|  587.598|  0.000|  1|      1.000|
|NFIL      |GEN:ENV |   14| -288.045|  604.091| 16.492|  1|      0.000|
|MMG       |GEN     |   14| -748.322| 1524.645|  0.000|  1|      1.000|
|MMG       |GEN:ENV |   14| -767.828| 1563.656| 39.012|  1|      0.000|
|NGE       |GEN     |   14| -819.190| 1666.381|  0.000|  1|      1.000|
|NGE       |GEN:ENV |   14| -824.591| 1677.181| 10.800|  1|      0.001|

## Componentes de variância


```r
vcomp <- gmd(met_mixed, "vcomp")
## Class of the model: waasb
## Variable extracted: vcomp
print_tbl(vcomp)
```



|Group    | ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|     MGE|  NFIL|      MMG|      NGE|
|:--------|---------:|-------:|------:|------:|--------:|--------:|-------:|-----:|--------:|--------:|
|GEN      |     0.000|   0.000|  0.000|  0.557|    0.000|    0.029|  30.289| 0.000|    0.000|    0.000|
|GEN:ENV  |     0.043|   0.030|  0.463|  2.822|    3.567|    0.455| 342.966| 0.958| 1146.666| 1283.647|
|Residual |     0.022|   0.021|  1.084|  2.595|    1.652|    0.903| 386.809| 1.645|  918.444| 3167.981|

```r
# plot
plot(met_mixed, type = "vcomp")
```

<img src="/tutorials/gemsr/06_conjunta_files/figure-html/unnamed-chunk-7-1.png" width="960" />


## Parâmetros genéticos


```r
genpar <- gmd(met_mixed, "genpar")
## Class of the model: waasb
## Variable extracted: genpar
print_tbl(genpar)
```



|Parameters          | ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|     MGE|  NFIL|      MMG|      NGE|
|:-------------------|---------:|-------:|------:|------:|--------:|--------:|-------:|-----:|--------:|--------:|
|Phenotypic variance |     0.065|   0.051|  1.548|  5.974|    5.219|    1.386| 760.064| 2.603| 2065.110| 4451.628|
|Heritability        |     0.007|   0.000|  0.000|  0.093|    0.000|    0.021|   0.040| 0.000|    0.000|    0.000|
|GEIr2               |     0.650|   0.594|  0.299|  0.472|    0.683|    0.328|   0.451| 0.368|    0.555|    0.288|
|h2mg                |     0.035|   0.000|  0.000|  0.377|    0.000|    0.134|   0.204| 0.000|    0.000|    0.000|
|Accuracy            |     0.187|   0.000|  0.000|  0.614|    0.000|    0.366|   0.452| 0.000|    0.000|    0.000|
|rge                 |     0.655|   0.594|  0.299|  0.521|    0.683|    0.335|   0.470| 0.368|    0.555|    0.288|
|CVg                 |     0.858|   0.001|  0.000|  1.506|    0.000|    1.071|   3.182| 0.000|    0.000|    0.000|
|CVr                 |     6.027|  10.721|  6.867|  3.252|    4.431|    5.949|  11.372| 7.954|    8.949|   11.001|
|CV ratio            |     0.142|   0.000|  0.000|  0.463|    0.000|    0.180|   0.280| 0.000|    0.000|    0.000|


Na saída acima, além dos componentes de variância para os efeitos aleatórios declarados, alguns parâmetros importantes também são mostrados.

**Heritability** é a herdabilidade em sentido amplo, \\(\mathop h \nolimits_g ^ 2\\), estimada por 

$$
\mathop h\nolimits_g^2  = \frac{\mathop {\hat\sigma} \nolimits_g^2} {\mathop {\hat\sigma} \nolimits_g^2  + \mathop {\hat\sigma} \nolimits_i^2  + \mathop {\hat\sigma} \nolimits_e^2 }
$$

onde \\(\mathop {\hat \sigma} \nolimits_g ^ 2\\) é a variância genotípica; \\(\mathop {\hat \sigma} \nolimits_i ^ 2\\) é a variância da interação genótipo *vs* ambiente; e \\(\mathop {\hat \sigma} \nolimits_e ^ 2\\) é a variância residual.

**GEIr2** é o coeficiente de determinação dos efeitos de interação, \\(\mathop r \nolimits_i ^ 2\\), estimado por

$$
\mathop r\nolimits_i^2  = \frac{\mathop {\hat\sigma} \nolimits_i^2}
{\mathop {\hat\sigma} \nolimits_g^2  + \mathop {\hat\sigma} \nolimits_i^2  + \mathop {\hat\sigma} \nolimits_e^2 }
$$

**h2mg** é a herdabilidade com base na média, \\(\mathop h \nolimits\_{gm} ^ 2\\), estimada por

$$
\mathop h\nolimits_{gm}^2  = \frac{\mathop {\hat\sigma} \nolimits_g^2}{[\mathop {\hat\sigma} \nolimits_g^2  + \mathop {\hat\sigma} \nolimits_i^2 /e + \mathop {\hat\sigma} \nolimits_e^2 /\left( {eb} \right)]}
$$

onde *e* e *b* são o número de ambientes e blocos, respectivamente;

**Accuracy** é a acurácia de seleção, *Ac*, estimada por

$$
Ac = \sqrt{\mathop h\nolimits_{gm}^2}
$$

**rge** é a correlação genótipo-ambiente, \\(\mathop r \nolimits\_{ge}\\), estimada por

$$
\mathop r\nolimits_{ge} = \frac{\mathop {\hat\sigma} \nolimits_g^2}{\mathop {\hat\sigma} \nolimits_g^2  + \mathop {\hat\sigma} \nolimits_i^2}
$$

**CVg** e **CVr** são o coeficiente de variação genotípico e o coeficiente de variação residual estimado, respectivamente, por

$$
CVg  = \left( {\sqrt {\mathop {\hat \sigma }\nolimits_g^2 } /\mu } \right) \times 100
$$

e 

$$
CVr = \left( {\sqrt {\mathop {\hat \sigma }\nolimits_e^2 } /\mu } \right) \times 100
$$


onde \\(\mu\\) é a média geral.

**CV ratio** é a razão entre o coeficiente de variação genotípico e residual.


## BLUP para genótipos


```r
met_mixed$MGE$BLUPgen
## # A tibble: 13 x 7
##     Rank GEN       Y  BLUPg Predicted    LL    UL
##    <dbl> <fct> <dbl>  <dbl>     <dbl> <dbl> <dbl>
##  1     1 H6     188.  3.08       176.  168.  184.
##  2     2 H2     187.  2.87       176.  168.  184.
##  3     3 H4     184.  2.31       175.  167.  183.
##  4     4 H1     184.  2.21       175.  167.  183.
##  5     5 H5     184.  2.19       175.  167.  183.
##  6     6 H13    180.  1.41       174.  166.  182.
##  7     7 H7     171. -0.386      173.  164.  181.
##  8     8 H3     169. -0.712      172.  164.  180.
##  9     9 H11    167. -1.16       172.  164.  180.
## 10    10 H10    164. -1.85       171.  163.  179.
## 11    11 H8     160. -2.67       170.  162.  178.
## 12    12 H12    157. -3.16       170.  162.  178.
## 13    13 H9     153. -4.12       169.  161.  177.
blupg <- gmd(met_mixed, "blupg")
## Class of the model: waasb
## Variable extracted: blupg
print_tbl(blupg)
```



|GEN | ALT_PLANT| ALT_ESP| COMPES| DIAMES| COMP_SAB| DIAM_SAB|     MGE|   NFIL|     MMG|     NGE|
|:---|---------:|-------:|------:|------:|--------:|--------:|-------:|------:|-------:|-------:|
|H1  |     2.490|   1.343| 15.163| 50.155|   29.011|   15.935| 175.147| 16.123| 338.666| 511.644|
|H10 |     2.479|   1.343| 15.163| 49.121|   29.011|   15.961| 171.091| 16.123| 338.666| 511.644|
|H11 |     2.481|   1.343| 15.163| 49.250|   29.011|   15.975| 171.775| 16.123| 338.666| 511.644|
|H12 |     2.483|   1.343| 15.163| 49.179|   29.011|   15.815| 169.779| 16.123| 338.666| 511.644|
|H13 |     2.487|   1.343| 15.163| 49.924|   29.011|   15.951| 174.348| 16.123| 338.666| 511.644|
|H2  |     2.489|   1.343| 15.163| 50.058|   29.011|   15.978| 175.811| 16.123| 338.666| 511.644|
|H3  |     2.489|   1.343| 15.163| 49.504|   29.011|   15.934| 172.227| 16.123| 338.666| 511.644|
|H4  |     2.488|   1.343| 15.163| 49.427|   29.011|   16.044| 175.252| 16.123| 338.666| 511.644|
|H5  |     2.488|   1.343| 15.163| 49.674|   29.011|   16.054| 175.124| 16.123| 338.666| 511.644|
|H6  |     2.487|   1.343| 15.163| 50.287|   29.011|   16.050| 176.016| 16.123| 338.666| 511.644|
|H7  |     2.482|   1.343| 15.163| 49.511|   29.011|   15.996| 172.553| 16.123| 338.666| 511.644|
|H8  |     2.479|   1.343| 15.163| 49.092|   29.011|   15.961| 170.267| 16.123| 338.666| 511.644|
|H9  |     2.481|   1.343| 15.163| 48.804|   29.011|   15.960| 168.815| 16.123| 338.666| 511.644|

## Plotar o BLUP para genótipos


```r
a <- plot_blup(met_mixed, var = "MGE")
b <- plot_blup(met_mixed,
               var = "MGE",
               col.shape = c("gray20", "gray80"),
               plot_theme = theme_metan(grid = "y"))
arrange_ggplot(a, b, tag_levels = "a")
```

<img src="/tutorials/gemsr/06_conjunta_files/figure-html/unnamed-chunk-10-1.png" width="960" />

Esta saída mostra as médias previstas para genótipos. **BLUPg** é o efeito genotípico \\((\hat{g_i})\\), que considerando dados balanceados e genótipo como efeito aleatório é estimado por

$$
\hat g_{i} = h_g ^ 2(\bar y_{i.} - \bar y_{..})
$$

onde \\(h_g ^ 2\\) é o efeito de *shrinkage* do genótipo.

**Predicted** é a média predita, dada por

$$
\hat {g}_{i} + \mu
$$

onde \\(\mu\\) é a média geral.



**LL** e **UL** são os limites inferior e superior, respectivamente, estimados por 

$$
(\hat {g}_{i} + \mu) \pm {CI}
$$

com

$$
CI = t \times \sqrt {((1-Ac) \times {\mathop \sigma \nolimits_g ^ 2)}}
$$

onde \\(t\\) é o valor *t* de Student para um teste *t* bicaudal em uma data probabilidade; \\(Ac\\) é a acurácia da seleção e \\(\mathop\sigma\nolimits_g ^2\\) é a variância genotípica.

## BLUP para combinação de genótipos X ambiente


```r
blupint <- met_mixed$MGE$BLUPint
print_tbl(blupint)
```



|ENV |GEN |REP |  BLUPg|  BLUPge| BLUPg+ge| Predicted|
|:---|:---|:---|------:|-------:|--------:|---------:|
|A1  |H1  |I   |  2.208|   0.759|    2.967|   204.306|
|A1  |H1  |II  |  2.208|   0.759|    2.967|   202.512|
|A1  |H1  |III |  2.208|   0.759|    2.967|   200.395|
|A1  |H10 |I   | -1.848|  -3.765|   -5.613|   195.726|
|A1  |H10 |II  | -1.848|  -3.765|   -5.613|   193.932|
|A1  |H10 |III | -1.848|  -3.765|   -5.613|   191.815|
|A1  |H11 |I   | -1.164|  -7.282|   -8.446|   192.893|
|A1  |H11 |II  | -1.164|  -7.282|   -8.446|   191.099|
|A1  |H11 |III | -1.164|  -7.282|   -8.446|   188.982|
|A1  |H12 |I   | -3.159| -11.481|  -14.641|   186.698|
|A1  |H12 |II  | -3.159| -11.481|  -14.641|   184.904|
|A1  |H12 |III | -3.159| -11.481|  -14.641|   182.787|
|A1  |H13 |I   |  1.409|  12.906|   14.315|   215.654|
|A1  |H13 |II  |  1.409|  12.906|   14.315|   213.860|
|A1  |H13 |III |  1.409|  12.906|   14.315|   211.743|
|A1  |H2  |I   |  2.872|   1.106|    3.978|   205.317|
|A1  |H2  |II  |  2.872|   1.106|    3.978|   203.523|
|A1  |H2  |III |  2.872|   1.106|    3.978|   201.406|
|A1  |H3  |I   | -0.712|  -0.376|   -1.088|   200.251|
|A1  |H3  |II  | -0.712|  -0.376|   -1.088|   198.457|
|A1  |H3  |III | -0.712|  -0.376|   -1.088|   196.339|
|A1  |H4  |I   |  2.313|   0.053|    2.366|   203.705|
|A1  |H4  |II  |  2.313|   0.053|    2.366|   201.911|
|A1  |H4  |III |  2.313|   0.053|    2.366|   199.794|
|A1  |H5  |I   |  2.185|  -6.486|   -4.301|   197.038|
|A1  |H5  |II  |  2.185|  -6.486|   -4.301|   195.244|
|A1  |H5  |III |  2.185|  -6.486|   -4.301|   193.126|
|A1  |H6  |I   |  3.077|  21.323|   24.400|   225.738|
|A1  |H6  |II  |  3.077|  21.323|   24.400|   223.945|
|A1  |H6  |III |  3.077|  21.323|   24.400|   221.827|
|A1  |H7  |I   | -0.386| -12.721|  -13.106|   188.232|
|A1  |H7  |II  | -0.386| -12.721|  -13.106|   186.438|
|A1  |H7  |III | -0.386| -12.721|  -13.106|   184.321|
|A1  |H8  |I   | -2.672|  -0.476|   -3.148|   198.191|
|A1  |H8  |II  | -2.672|  -0.476|   -3.148|   196.397|
|A1  |H8  |III | -2.672|  -0.476|   -3.148|   194.279|
|A1  |H9  |I   | -4.124|   6.440|    2.317|   203.655|
|A1  |H9  |II  | -4.124|   6.440|    2.317|   201.861|
|A1  |H9  |III | -4.124|   6.440|    2.317|   199.744|
|A2  |H1  |I   |  2.208|  12.757|   14.965|   181.613|
|A2  |H1  |II  |  2.208|  12.757|   14.965|   183.216|
|A2  |H1  |III |  2.208|  12.757|   14.965|   185.373|
|A2  |H10 |I   | -1.848|  -4.866|   -6.714|   159.934|
|A2  |H10 |II  | -1.848|  -4.866|   -6.714|   161.537|
|A2  |H10 |III | -1.848|  -4.866|   -6.714|   163.694|
|A2  |H11 |I   | -1.164|  -2.663|   -3.827|   162.821|
|A2  |H11 |II  | -1.164|  -2.663|   -3.827|   164.424|
|A2  |H11 |III | -1.164|  -2.663|   -3.827|   166.581|
|A2  |H12 |I   | -3.159| -24.712|  -27.871|   138.777|
|A2  |H12 |II  | -3.159| -24.712|  -27.871|   140.380|
|A2  |H12 |III | -3.159| -24.712|  -27.871|   142.537|
|A2  |H13 |I   |  1.409|  -0.564|    0.846|   167.494|
|A2  |H13 |II  |  1.409|  -0.564|    0.846|   169.097|
|A2  |H13 |III |  1.409|  -0.564|    0.846|   171.254|
|A2  |H2  |I   |  2.872|  34.556|   37.429|   204.077|
|A2  |H2  |II  |  2.872|  34.556|   37.429|   205.680|
|A2  |H2  |III |  2.872|  34.556|   37.429|   207.837|
|A2  |H3  |I   | -0.712|  16.874|   16.162|   182.810|
|A2  |H3  |II  | -0.712|  16.874|   16.162|   184.414|
|A2  |H3  |III | -0.712|  16.874|   16.162|   186.570|
|A2  |H4  |I   |  2.313|  19.416|   21.729|   188.377|
|A2  |H4  |II  |  2.313|  19.416|   21.729|   189.980|
|A2  |H4  |III |  2.313|  19.416|   21.729|   192.137|
|A2  |H5  |I   |  2.185|  11.353|   13.538|   180.186|
|A2  |H5  |II  |  2.185|  11.353|   13.538|   181.789|
|A2  |H5  |III |  2.185|  11.353|   13.538|   183.946|
|A2  |H6  |I   |  3.077|  31.626|   34.703|   201.351|
|A2  |H6  |II  |  3.077|  31.626|   34.703|   202.954|
|A2  |H6  |III |  3.077|  31.626|   34.703|   205.111|
|A2  |H7  |I   | -0.386| -17.624|  -18.009|   148.639|
|A2  |H7  |II  | -0.386| -17.624|  -18.009|   150.242|
|A2  |H7  |III | -0.386| -17.624|  -18.009|   152.399|
|A2  |H8  |I   | -2.672| -38.376|  -41.047|   125.600|
|A2  |H8  |II  | -2.672| -38.376|  -41.047|   127.204|
|A2  |H8  |III | -2.672| -38.376|  -41.047|   129.361|
|A2  |H9  |I   | -4.124| -37.779|  -41.903|   124.745|
|A2  |H9  |II  | -4.124| -37.779|  -41.903|   126.348|
|A2  |H9  |III | -4.124| -37.779|  -41.903|   128.505|
|A3  |H1  |I   |  2.208|   5.667|    7.875|   157.348|
|A3  |H1  |II  |  2.208|   5.667|    7.875|   146.845|
|A3  |H1  |III |  2.208|   5.667|    7.875|   159.865|
|A3  |H10 |I   | -1.848| -17.737|  -19.585|   129.888|
|A3  |H10 |II  | -1.848| -17.737|  -19.585|   119.385|
|A3  |H10 |III | -1.848| -17.737|  -19.585|   132.405|
|A3  |H11 |I   | -1.164|  -3.584|   -4.748|   144.725|
|A3  |H11 |II  | -1.164|  -3.584|   -4.748|   134.222|
|A3  |H11 |III | -1.164|  -3.584|   -4.748|   147.241|
|A3  |H12 |I   | -3.159|   3.423|    0.264|   149.737|
|A3  |H12 |II  | -3.159|   3.423|    0.264|   139.234|
|A3  |H12 |III | -3.159|   3.423|    0.264|   152.254|
|A3  |H13 |I   |  1.409|  24.261|   25.670|   175.143|
|A3  |H13 |II  |  1.409|  24.261|   25.670|   164.640|
|A3  |H13 |III |  1.409|  24.261|   25.670|   177.660|
|A3  |H2  |I   |  2.872|   7.722|   10.594|   160.067|
|A3  |H2  |II  |  2.872|   7.722|   10.594|   149.564|
|A3  |H2  |III |  2.872|   7.722|   10.594|   162.584|
|A3  |H3  |I   | -0.712|  -5.169|   -5.881|   143.592|
|A3  |H3  |II  | -0.712|  -5.169|   -5.881|   133.089|
|A3  |H3  |III | -0.712|  -5.169|   -5.881|   146.109|
|A3  |H4  |I   |  2.313|  -4.120|   -1.807|   147.665|
|A3  |H4  |II  |  2.313|  -4.120|   -1.807|   137.162|
|A3  |H4  |III |  2.313|  -4.120|   -1.807|   150.182|
|A3  |H5  |I   |  2.185|   8.810|   10.995|   160.468|
|A3  |H5  |II  |  2.185|   8.810|   10.995|   149.965|
|A3  |H5  |III |  2.185|   8.810|   10.995|   162.984|
|A3  |H6  |I   |  3.077|  -9.317|   -6.241|   143.232|
|A3  |H6  |II  |  3.077|  -9.317|   -6.241|   132.729|
|A3  |H6  |III |  3.077|  -9.317|   -6.241|   145.749|
|A3  |H7  |I   | -0.386|   6.708|    6.323|   155.796|
|A3  |H7  |II  | -0.386|   6.708|    6.323|   145.293|
|A3  |H7  |III | -0.386|   6.708|    6.323|   158.312|
|A3  |H8  |I   | -2.672|  -1.968|   -4.640|   144.833|
|A3  |H8  |II  | -2.672|  -1.968|   -4.640|   134.330|
|A3  |H8  |III | -2.672|  -1.968|   -4.640|   147.349|
|A3  |H9  |I   | -4.124| -14.695|  -18.818|   130.654|
|A3  |H9  |II  | -4.124| -14.695|  -18.818|   120.151|
|A3  |H9  |III | -4.124| -14.695|  -18.818|   133.171|
|A4  |H1  |I   |  2.208|   5.818|    8.026|   186.044|
|A4  |H1  |II  |  2.208|   5.818|    8.026|   182.686|
|A4  |H1  |III |  2.208|   5.818|    8.026|   186.563|
|A4  |H10 |I   | -1.848|   5.442|    3.594|   181.613|
|A4  |H10 |II  | -1.848|   5.442|    3.594|   178.254|
|A4  |H10 |III | -1.848|   5.442|    3.594|   182.132|
|A4  |H11 |I   | -1.164|   0.345|   -0.819|   177.199|
|A4  |H11 |II  | -1.164|   0.345|   -0.819|   173.840|
|A4  |H11 |III | -1.164|   0.345|   -0.819|   177.718|
|A4  |H12 |I   | -3.159|  -3.005|   -6.164|   171.854|
|A4  |H12 |II  | -3.159|  -3.005|   -6.164|   168.496|
|A4  |H12 |III | -3.159|  -3.005|   -6.164|   172.373|
|A4  |H13 |I   |  1.409| -20.643|  -19.234|   158.785|
|A4  |H13 |II  |  1.409| -20.643|  -19.234|   155.426|
|A4  |H13 |III |  1.409| -20.643|  -19.234|   159.304|
|A4  |H2  |I   |  2.872| -10.860|   -7.987|   170.031|
|A4  |H2  |II  |  2.872| -10.860|   -7.987|   166.672|
|A4  |H2  |III |  2.872| -10.860|   -7.987|   170.550|
|A4  |H3  |I   | -0.712| -19.386|  -20.098|   157.921|
|A4  |H3  |II  | -0.712| -19.386|  -20.098|   154.562|
|A4  |H3  |III | -0.712| -19.386|  -20.098|   158.440|
|A4  |H4  |I   |  2.313|  10.840|   13.153|   191.172|
|A4  |H4  |II  |  2.313|  10.840|   13.153|   187.813|
|A4  |H4  |III |  2.313|  10.840|   13.153|   191.691|
|A4  |H5  |I   |  2.185|  11.065|   13.250|   191.269|
|A4  |H5  |II  |  2.185|  11.065|   13.250|   187.910|
|A4  |H5  |III |  2.185|  11.065|   13.250|   191.788|
|A4  |H6  |I   |  3.077|  -8.793|   -5.717|   172.302|
|A4  |H6  |II  |  3.077|  -8.793|   -5.717|   168.943|
|A4  |H6  |III |  3.077|  -8.793|   -5.717|   172.821|
|A4  |H7  |I   | -0.386|  19.270|   18.884|   196.903|
|A4  |H7  |II  | -0.386|  19.270|   18.884|   193.544|
|A4  |H7  |III | -0.386|  19.270|   18.884|   197.422|
|A4  |H8  |I   | -2.672|  10.566|    7.894|   185.913|
|A4  |H8  |II  | -2.672|  10.566|    7.894|   182.554|
|A4  |H8  |III | -2.672|  10.566|    7.894|   186.432|
|A4  |H9  |I   | -4.124|  -0.659|   -4.783|   173.235|
|A4  |H9  |II  | -4.124|  -0.659|   -4.783|   169.877|
|A4  |H9  |III | -4.124|  -0.659|   -4.783|   173.754|

Esta saída mostra as médias preditas para cada combinação de genótipo e ambiente. **BLUPg** é o efeito genotípico descrito acima. **BLUPge** é o efeito genotípico do *i*-ésimo genótipo no *j*-ésimo ambiente \\((\hat g_{ij})\\), que considerando dados balanceados e genótipo como efeito aleatório é estimado por:

$$
\hat g_{ij} = h_g ^ 2 (\bar y_{i.} - \bar y_{..}) + h_{ge} ^ 2 (y_{ij} - \bar y_{i.} - \bar y_{.j} + \bar y_{..})
$$

onde \\(h_{ge} ^2\\) é o efeito *shrinkage* para a interação genótipo por ambiente; 

**BLUPg + ge** é o BLUP genotipico somado ao BLUP da interação do genótipo \\(i\\) no ambiente \\(j\\).

**Predicted** é o valor predito (\\(\hat y_{ij}\\)) dado por


$$
\hat y_{ij} = \bar y_{.j} + BLUP_{g+ge}
$$


[^1]: Henderson, C. R. (1975). Best linear unbiased estimation and prediction under a selection model. *Biometrics*, *31*(2), 423--447. <https://doi.org/10.2307/2529430>
