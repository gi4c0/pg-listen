import { wNothing, WNothingType, WPromiseResolveType } from '@w/utility';

export function delay(ms: number): Promise<WNothingType> {
  return new Promise((resolve: WPromiseResolveType<WNothingType>) => {
    setTimeout(
      (): WNothingType => {
        resolve(wNothing);
        return;
      },
      ms
    );
  });
}
