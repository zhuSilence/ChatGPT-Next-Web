import { ImageModelConfig } from "../store";

import Locale from "../locales";
import { InputRange } from "./input-range";
import { ListItem, Select } from "./ui-lib";

export function ImageModelConfigList(props: {
  imageModelConfig: ImageModelConfig;
  updateConfig: (updater: (config: ImageModelConfig) => void) => void;
}) {
  return (
    <>
      <ListItem title={Locale.Settings.ImageModel.Title}>
        <input value={Locale.Settings.ImageModel.Model} disabled={true} />
      </ListItem>
      <ListItem title={Locale.Settings.ImageModel.Command}>
        <input
          value={props.imageModelConfig.command}
          onChange={(e) => {
            props.updateConfig((config) => {
              config.command = e.currentTarget.value; // Assign the parsed value
              return config;
            });
          }}
        />
      </ListItem>
      <ListItem title={Locale.Settings.ImageModel.NoOfImage}>
        <InputRange
          value={props.imageModelConfig.noOfImage.toString()} // Keep the value as a string
          onChange={(e) => {
            const newValue = parseInt(e.currentTarget.value, 4); // Parse the value as an integer
            if (!isNaN(newValue)) {
              props.updateConfig((config) => {
                config.noOfImage = newValue; // Assign the parsed value
                return config;
              });
            }
          }}
          min={"1"} // Convert the min value to a string
          max={"1"} // Convert the max value to a string
          step={"1"} // Convert the step value to a string
        />
      </ListItem>
      <ListItem title={Locale.Settings.ImageModel.Size}>
        <Select
          value={props.imageModelConfig.size}
          onChange={(e) => {
            props.updateConfig((config) => {
              config.size = e.currentTarget.value;
              return config;
            });
          }}
        >
          <option value="1024x1024" key="1024x1024">
            1024x1024
          </option>
          <option value="1024x1792" key="1024x1792">
            1024x1792
          </option>
          <option value="1792x1024" key="1792x1024">
            1792x1024
          </option>
        </Select>
      </ListItem>
      <ListItem title={Locale.Settings.ImageModel.Style}>
        <Select
          value={props.imageModelConfig.style}
          onChange={(e) => {
            props.updateConfig((config) => {
              config.style = e.currentTarget.value;
              return config;
            });
          }}
        >
          <option value="vivid" key="vivid">
            vivid
          </option>
          <option value="natural" key="natural">
            natural
          </option>
        </Select>
      </ListItem>
      <ListItem title={Locale.Settings.ImageModel.Quality}>
        <Select
          value={props.imageModelConfig.quality}
          onChange={(e) => {
            props.updateConfig((config) => {
              config.quality = e.currentTarget.value;
              return config;
            });
          }}
        >
          <option value="hd" key="hd">
            hd
          </option>
          <option value="standard" key="standard">
            standard
          </option>
        </Select>
      </ListItem>
    </>
  );
}
