Feature: Validación de Bounding Boxes
  Como sistema de anotación
  Quiero requerir una categoría para cada bounding box
  Para asegurar la validez del dataset COCO exportado

  Scenario: Intento de guardar una caja sin categoría
    Given un bounding box con coordenadas x, y, width, height válidas
    When intento procesar el bounding box sin proporcionar un category_id
    Then el sistema debe rechazar la operación con un error de validación de Zod
