Feature: Exportación del dataset en formato COCO
  Como usuario del portal
  Quiero exportar imágenes, categorías y anotaciones en formato COCO estándar
  Para poder entrenar un modelo de detección de objetos con el dataset

  Scenario: El bbox exportado usa píxeles absolutos en formato [x, y, width, height]
    Given una anotación guardada con bbox x=10, y=20, width=100, height=50
    When exporto el dataset a formato COCO
    Then la anotación exportada debe traer bbox igual a [10, 20, 100, 50]

  Scenario: El área exportada es coherente con el bbox
    Given una anotación guardada con bbox width=100, height=50
    When exporto el dataset a formato COCO
    Then el campo area de la anotación exportada debe ser 5000

  Scenario: Los ids son consistentes entre las tres secciones del JSON
    Given una imagen, una categoría y una anotación que las referencia
    When exporto el dataset a formato COCO
    Then annotations[].image_id debe coincidir con el id de esa imagen en images[]
    And annotations[].category_id debe coincidir con el id de esa categoría en categories[]

  Scenario: Cada anotación exportada incluye el campo iscrowd
    Given una anotación guardada sin marcar como grupo (isCrowd = 0)
    When exporto el dataset a formato COCO
    Then la anotación exportada debe incluir iscrowd igual a 0
