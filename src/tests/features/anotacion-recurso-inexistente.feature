Feature: Integridad al modificar anotaciones inexistentes
  Como sistema de anotación
  Quiero que actualizar o borrar una anotación que no existe falle explícitamente
  Para que el cliente nunca crea que guardó o borró algo que nunca existió

  @anotacionUpdateInexistente
  Scenario: Intento de actualizar una anotación con un id que no existe
    Given no existe ninguna anotación con id 999999
    When intento actualizar la categoría de la anotación 999999
    Then el sistema debe rechazar la operación indicando que el recurso no existe

  @anotacionDeleteInexistente
  Scenario: Intento de borrar una anotación con un id que no existe
    Given no existe ninguna anotación con id 999999
    When intento borrar la anotación 999999
    Then el sistema debe rechazar la operación indicando que el recurso no existe
