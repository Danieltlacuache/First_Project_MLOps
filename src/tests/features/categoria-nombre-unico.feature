Feature: Unicidad del nombre de categoría
  Como sistema de anotación
  Quiero impedir dos categorías con el mismo nombre
  Para que el selector de clases y el dataset COCO no tengan ambigüedad

  @categoriaNombreUnico
  Scenario: Intento de crear una categoría con un nombre que ya existe
    Given una categoría "car" ya registrada en el sistema
    When intento crear otra categoría también llamada "car"
    Then el sistema debe rechazar la operación con un error claro de nombre duplicado
    And la categoría original no debe modificarse
