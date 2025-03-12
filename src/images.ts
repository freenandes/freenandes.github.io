import type { LocalImageService } from "astro";
import sharpService from "astro/assets/services/sharp";
const service: LocalImageService = {
    ...sharpService,
    validateOptions(options, imageConfig) {
      options.quality = 85;
      return sharpService.validateOptions(options, imageConfig);
    }
};
export default service;