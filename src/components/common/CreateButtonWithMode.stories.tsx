import { Meta, StoryFn } from '@storybook/react';
import CreateButtonWithMode from './CreateButtonWithMode';

export default {
  title: 'KubeVirt/Common/CreateButtonWithMode',
  component: CreateButtonWithMode,
} as Meta;

const Template: StoryFn<typeof CreateButtonWithMode> = args => <CreateButtonWithMode {...args} />;

export const CreateVM = Template.bind({});
CreateVM.args = {
  label: 'Create VM',
  onCreateForm: () => alert('Open form'),
  onCreateYAML: () => alert('Open YAML editor'),
};

export const CreateNetwork = Template.bind({});
CreateNetwork.args = {
  label: 'Create Network',
  onCreateForm: () => alert('Open form'),
  onCreateYAML: () => alert('Open YAML editor'),
};

export const CreateDataSource = Template.bind({});
CreateDataSource.args = {
  label: 'Create DataSource',
  onCreateForm: () => alert('Open form'),
  onCreateYAML: () => alert('Open YAML editor'),
};
