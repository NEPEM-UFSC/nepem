+++
title = "Measuring plant disease severity in R: introducing and evaluating the pliman package"
date = "2022-01-01"
publication_types = ["2"]
authors = ["Olivoto T.", "Andrade S.", "Del Ponte E."]
publication = "In: **Tropical Plant Pathology**, 1(NA):1--10, [10.1007/S40858-021-00487-5](10.1007/S40858-021-00487-5)"
abstract = "Image analysis based on color thresholding is the reference method for measuring severity as percent area affected. It is deemed to produce accurate results, usually considered the “true” severity value. More than a dozen applications have been used for the task in phytopathometry studies, but none was coded in r language. Here we introduced and evaluated pliman, a suite for the analysis of plant images. In particular, we show functions for computing percent severity based on rgb information contained in image palettes prepared by the user. Six image collections, totaling 249 images, from different diseases (wheat tan spot, soybean rust, olive leaf spot, rice brown spot, bean angular spot, and xyllela fastidiosa on tobacco) exhibiting a range of symptomatic patterns and severity were used to evaluate the agreement of pliman predictions with measures by three other software: aps assess, leafdoctor, and imagej. Three users independently prepared three image palettes (each representing leaf background, symptomatic, or healthy leaf tissue) by manually inspecting and subsetting these target areas of the images. Pliman predictions by a joint palette (by joining images by the three users into one) were highly concordant ($rho$c textgreater 0.98) with measures by the other software for all but xylella fastidiosa on tobacco ($rho$c = 0.49). The error for the latter may be due to the low contrast between symptomatic and healthy tobacco tissues. Users showed to be a source of variation in the overall concordance depending on the disease. Reduction in the image resolution (textless 1 megapixel) did not impact the results. Combined with parallel processing, the use of low image resolution (1078 × 680) decreased processing time, resulting in pliman being ~ 150 to ~ 700 times faster than existing tools for disease quantification. Pliman showed great potential to produce accurate measures and accelerate studies involving plant disease severity measurements, especially for the batch processing of large sets of image collections."
abstract_short = ""
tags = []
image_preview = ""
selected = false
projects = []
url_pdf = ""
url_preprint = ""
url_code = ""
url_dataset = ""
url_project = ""
url_slides = ""
url_video = ""
url_poster = ""
url_source = ""
math = true
highlight = true
[header]
image = ""
caption = ""
+++
