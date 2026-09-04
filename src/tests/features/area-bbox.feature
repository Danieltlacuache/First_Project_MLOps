Feature: Cálculo de área del bounding box
  Como sistema de anotación
  Quiero calcular el área de cada bounding box como ancho por alto
  Para que el dataset COCO exportado tenga áreas coherentes

  Scenario: El área es el producto de ancho y alto
    Given un bounding box con width=30 y height=4
    When calculo el área del bounding box
    Then el área debe ser 120
