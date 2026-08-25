/*
 * Static, educational red-flag checklist from TransparentCars' buying guide.
 * NO data processing — this list is identical on every listing. It exists to
 * make the buyer look, not to accuse any specific seller.
 */
(function () {
  'use strict';
  if (!window.__TC) return;

  window.__TC.REDFLAGS = [
    {
      title: 'Quilómetros adulterados',
      body: 'Volante, pedais ou banco muito gastos para os km indicados? Pede o histórico de inspeções (IPO) — a quilometragem fica registada em cada inspeção.'
    },
    {
      title: 'Danos escondidos',
      body: 'Tinta com tons diferentes, folgas irregulares entre painéis ou parafusos marcados sugerem reparação de acidente. Vê o carro à luz do dia.'
    },
    {
      title: 'Dívidas e multas seguem o carro',
      body: 'IUC em atraso, penhoras ou reservas de propriedade passam para ti. Confirma que está tudo pago e sem ónus ANTES de transferir a propriedade.'
    },
    {
      title: 'Falso "particular"',
      body: 'Vários carros do mesmo contacto, ou pedido de sinal antes de veres o carro? Para. Um particular genuíno deixa-te ver e testar sem pressão.'
    },
    {
      title: 'Taxas "surpresa" no fim',
      body: 'Custos de "preparação", "documentação" ou "reserva" que aparecem só no fecho. Pede o preço final por escrito antes de te comprometeres.'
    }
  ];
})();
