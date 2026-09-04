Feature: Validación de dimensiones del bounding box
  Como sistema de anotación
  Quiero rechazar bounding boxes con ancho o alto menor o igual a cero
  Para evitar cajas degeneradas en el dataset exportado

  Scenario: Un bounding box con ancho cero se rechaza
    Given un bounding box con width=0 y height=10
    When intento validar el bounding box
    Then el sistema debe rechazar la operación con un error de validación de Zod

  Scenario: Un bounding box con alto cero se rechaza
    Given un bounding box con width=10 y height=0
    When intento validar el bounding box
    Then el sistema debe rechazar la operación con un error de validación de Zod
