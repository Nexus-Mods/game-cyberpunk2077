// import * as mockedVortexApi from "vortex-api";
import {
  isLeft,
} from "fp-ts/lib/Either";
import {
  decodeLoadOrder,
  encodeLoadOrder,
  LoadOrder,
  LOAD_ORDER_TYPE_VERSION,
  ModList,
} from "../../src/load_order.types";
import {
  loadOrderToREDdeployModList,
  makeV2077LoadOrderFrom,
} from "../../src/load_order";

import * as loTestData from "./loadorder.example";


describe(`Load Order`, () => {

  describe(`Types and Serialization`, () => {

    test(`LoadOrder encodes and decodes roundtrip`, () => {
      const loadOrder: LoadOrder = {
        loadOrderFormatVersion: LOAD_ORDER_TYPE_VERSION,
        ownerVortexProfileId: `testprofileid`,
        generatedAt: `2021-01-01T00:00:00.000Z`,
        entriesInOrderWithEarlierWinning: [
          {
            vortexId: `testvortexid`,
            vortexModId: `testvortexmodid`,
            vortexModVersion: `testvortexmodversion`,
            redmodName: `testredmodname`,
            redmodVersion: `testredmodversion`,
            redmodPath: `testredmodpath`,
            enabled: true,
          },
        ],
      };

      const encoded = encodeLoadOrder(loadOrder);

      const decoded = decodeLoadOrder(encoded);

      if (isLeft(decoded)) {
        throw decoded.left;
      }

      expect(decoded.right).toEqual(loadOrder);
    });

  }); // Types and Serialization


  describe(`Vortex load order to v2077 load order mapping`, () => {

    test(`makeV2077LoadOrderFrom Vortex load order does exactly that`, () => {
      const fakeDate = Date.now();
      const expectedDateString = new Date(fakeDate).toISOString();

      const fakeOwnerVortexProfileId = `xyZzyZx`;

      const { vortexLoadOrder } = loTestData;

      const expectedV2077LoadOrder: LoadOrder = {
        ...loTestData.v2077LoadOrder,
        generatedAt: expectedDateString,
      };

      const generatedV2077LoadOrder =
        makeV2077LoadOrderFrom(vortexLoadOrder, fakeOwnerVortexProfileId, fakeDate);

      expect(generatedV2077LoadOrder).toEqual(expectedV2077LoadOrder);
    });

  });


  describe(`REDdeploy modlist generation`, () => {

    test(`lists the enabled mods in load order`, () => {

      const expectedModList: ModList = loTestData.v2077ModList;

      const redDeployModListGenerated =
        loadOrderToREDdeployModList(loTestData.v2077LoadOrder);

      expect(redDeployModListGenerated).toEqual(expectedModList);
    });

    test(`is empty when the load order has no mods`, () => {

      const noModsInLoadOrder: LoadOrder = {
        ...loTestData.v2077LoadOrder,
        entriesInOrderWithEarlierWinning: [],
      };

      const expectedModList: ModList = loTestData.emptyV2077ModList;

      const redDeployModListGenerated =
        loadOrderToREDdeployModList(noModsInLoadOrder);

      expect(redDeployModListGenerated).toEqual(expectedModList);
    });

  }); // Load Order

}); // Load Order
