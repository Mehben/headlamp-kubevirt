import { Icon } from '@iconify/react';
import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import { safeError } from '../../utils/sanitize';
import { toYaml } from '../../utils/yamlSerialize';
import { PROVIDER_TYPE_META, ProviderType } from './ForkliftProvider';

const STEPS = ['Provider Type', 'Connection Details', 'Review'];

const SOURCE_TYPES: ProviderType[] = ['vsphere', 'ovirt', 'openstack', 'ova', 'openshift'];

/** Inline help tooltip */
function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip title={text} arrow placement="right">
      <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }}>
        <Icon icon="mdi:information-outline" width={16} color="#888" />
      </IconButton>
    </Tooltip>
  );
}

/** Per-provider help text shown at the top of step 1 */
const PROVIDER_HELP: Record<string, { title: string; bullets: string[] }> = {
  vsphere: {
    title: 'VMware vSphere Provider',
    bullets: [
      'Connects to vCenter Server or standalone ESXi via the SDK endpoint.',
      'Requires a vCenter/ESXi account with at least read-only access to the inventory.',
      'VDDK (Virtual Disk Development Kit) is strongly recommended for disk transfer acceleration.',
      'Without VDDK, only cold migration is available — warm (incremental) migration requires VDDK for Changed Block Tracking (CBT).',
    ],
  },
  ovirt: {
    title: 'oVirt / Red Hat Virtualization',
    bullets: [
      'Connects to the oVirt Engine REST API.',
      'URL should point to /ovirt-engine/api.',
      'Requires an account with at least ReadOnlyAdmin role.',
      'Supports both cold and warm migration.',
    ],
  },
  openstack: {
    title: 'OpenStack Provider',
    bullets: [
      'Connects to OpenStack via the Keystone identity endpoint.',
      'Supports multiple authentication methods: password, token, or application credentials.',
      'URL should point to the Keystone v3 endpoint (port 5000).',
    ],
  },
  ova: {
    title: 'OVA File Provider',
    bullets: [
      'Imports VMs from OVA/OVF files stored on an NFS share.',
      'The NFS path must be accessible from the cluster nodes.',
      'No credentials are needed — just the NFS directory path.',
    ],
  },
  openshift: {
    title: 'OpenShift / KubeVirt Cluster',
    bullets: [
      'Connects to a remote OpenShift or KubeVirt cluster.',
      'Requires a ServiceAccount token with access to the KubeVirt API.',
      'Leave URL empty and skip the token to use the local cluster (host provider).',
    ],
  },
};


interface CreateProviderDialogProps {
  open: boolean;
  onClose: () => void;
  namespace?: string;
}

export default function CreateProviderDialog({
  open,
  onClose,
  namespace = 'konveyor-forklift',
}: CreateProviderDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  const [creating, setCreating] = useState(false);

  // Common fields
  const [name, setName] = useState('');

  // vSphere fields
  const [vsphereUrl, setVsphereUrl] = useState('');
  const [vsphereEndpoint, setVsphereEndpoint] = useState<'vcenter' | 'esxi'>('vcenter');
  const [vsphereUser, setVsphereUser] = useState('');
  const [vspherePassword, setVspherePassword] = useState('');
  const [vddkImage, setVddkImage] = useState('');
  const [skipTls, setSkipTls] = useState(false);
  const [caCert, setCaCert] = useState('');

  // oVirt fields
  const [ovirtUrl, setOvirtUrl] = useState('');
  const [ovirtUser, setOvirtUser] = useState('');
  const [ovirtPassword, setOvirtPassword] = useState('');

  // OpenStack fields
  const [openstackUrl, setOpenstackUrl] = useState('');
  const [openstackUser, setOpenstackUser] = useState('');
  const [openstackPassword, setOpenstackPassword] = useState('');
  const [openstackDomain, setOpenstackDomain] = useState('Default');
  const [openstackProject, setOpenstackProject] = useState('');
  const [openstackRegion, setOpenstackRegion] = useState('');

  // OVA fields
  const [nfsPath, setNfsPath] = useState('');

  // OpenShift fields
  const [openshiftUrl, setOpenshiftUrl] = useState('');
  const [openshiftToken, setOpenshiftToken] = useState('');

  // Credential mode: inline or existing secret
  const [credMode, setCredMode] = useState<'inline' | 'secret'>('inline');
  const [existingSecret, setExistingSecret] = useState('');
  const [secretNames, setSecretNames] = useState<string[]>([]);

  // Fetch secrets in namespace when dialog opens
  useEffect(() => {
    if (!open) return;
    ApiProxy.request(`/api/v1/namespaces/${namespace}/secrets`)
      .then((resp: { items?: Array<{ metadata: { name: string } }> }) => {
        setSecretNames(
          (resp?.items || [])
            .map(s => s.metadata.name)
            .filter(n => !n.startsWith('default-token-'))
            .sort()
        );
      })
      .catch(() => setSecretNames([]));
  }, [open, namespace]);

  const handleClose = () => {
    setStep(0);
    setProviderType(null);
    setName('');
    setVsphereUrl('');
    setVsphereEndpoint('vcenter');
    setVsphereUser('');
    setVspherePassword('');
    setVddkImage('');
    setSkipTls(false);
    setCaCert('');
    setOvirtUrl('');
    setOvirtUser('');
    setOvirtPassword('');
    setOpenstackUrl('');
    setOpenstackUser('');
    setOpenstackPassword('');
    setOpenstackDomain('Default');
    setOpenstackProject('');
    setOpenstackRegion('');
    setNfsPath('');
    setOpenshiftUrl('');
    setOpenshiftToken('');
    setCredMode('inline');
    setExistingSecret('');
    onClose();
  };

  const btoa64 = (s: string) => btoa(s);

  const buildSecretData = (): Record<string, string> => {
    switch (providerType) {
      case 'vsphere':
        return {
          user: btoa64(vsphereUser),
          password: btoa64(vspherePassword),
          url: btoa64(vsphereUrl),
          insecureSkipVerify: btoa64(skipTls ? 'true' : 'false'),
          ...(caCert && !skipTls ? { cacert: btoa64(caCert) } : {}),
        };
      case 'ovirt':
        return {
          user: btoa64(ovirtUser),
          password: btoa64(ovirtPassword),
          url: btoa64(ovirtUrl),
          insecureSkipVerify: btoa64(skipTls ? 'true' : 'false'),
          ...(caCert && !skipTls ? { cacert: btoa64(caCert) } : {}),
        };
      case 'openstack':
        return {
          authType: btoa64('password'),
          username: btoa64(openstackUser),
          password: btoa64(openstackPassword),
          domainName: btoa64(openstackDomain),
          projectName: btoa64(openstackProject),
          regionName: btoa64(openstackRegion),
          url: btoa64(openstackUrl),
          insecureSkipVerify: btoa64(skipTls ? 'true' : 'false'),
        };
      case 'openshift':
        return {
          token: btoa64(openshiftToken),
          url: btoa64(openshiftUrl),
          insecureSkipVerify: btoa64(skipTls ? 'true' : 'false'),
        };
      default:
        return {};
    }
  };

  const buildProviderSpec = () => {
    const spec: Record<string, unknown> = { type: providerType };

    switch (providerType) {
      case 'vsphere':
        spec.url = vsphereUrl;
        spec.settings = {
          sdkEndpoint: vsphereEndpoint,
          ...(vddkImage ? { vddkInitImage: vddkImage } : {}),
        };
        break;
      case 'ovirt':
        spec.url = ovirtUrl;
        break;
      case 'openstack':
        spec.url = openstackUrl;
        break;
      case 'ova':
        spec.url = nfsPath;
        break;
      case 'openshift':
        if (openshiftUrl) spec.url = openshiftUrl;
        break;
    }

    // Attach secret ref (except OVA which has no credentials)
    if (providerType !== 'ova') {
      const secretName = credMode === 'secret' ? existingSecret : `${name}-secret`;
      spec.secret = { name: secretName, namespace };
    }

    return spec;
  };

  const handleCreate = async () => {
    if (!providerType || !name) return;
    setCreating(true);

    try {
      // Create the credentials Secret first (if entering inline credentials)
      if (providerType !== 'ova' && credMode === 'inline') {
        const secret = {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: `${name}-secret`,
            namespace,
            labels: { 'createdForProviderType': providerType, 'createdForResourceType': 'providers' },
          },
          type: 'Opaque',
          data: buildSecretData(),
        };

        await ApiProxy.request(`/api/v1/namespaces/${namespace}/secrets`, {
          method: 'POST',
          body: JSON.stringify(secret),
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create the Provider
      const provider = {
        apiVersion: 'forklift.konveyor.io/v1beta1',
        kind: 'Provider',
        metadata: { name, namespace },
        spec: buildProviderSpec(),
      };

      await ApiProxy.request(
        `/apis/forklift.konveyor.io/v1beta1/namespaces/${namespace}/providers`,
        {
          method: 'POST',
          body: JSON.stringify(provider),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      enqueueSnackbar(`Provider "${name}" created`, { variant: 'success' });
      handleClose();
    } catch (e) {
      enqueueSnackbar(`Failed to create provider: ${safeError(e, 'provider-create')}`, {
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  const getUrl = () => {
    switch (providerType) {
      case 'vsphere': return vsphereUrl;
      case 'ovirt': return ovirtUrl;
      case 'openstack': return openstackUrl;
      case 'ova': return nfsPath;
      case 'openshift': return openshiftUrl;
      default: return '';
    }
  };

  /** Renders the credential mode radio + either inline user/password or secret picker */
  const renderCredentialMode = (
    user: string, setUser: (v: string) => void,
    password: string, setPassword: (v: string) => void,
    userPlaceholder = '', userHelper = ''
  ) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Credentials
        <InfoTip text="Enter credentials inline (a Secret will be created automatically), or reference an existing Secret in the namespace." />
      </Typography>
      <RadioGroup
        row
        value={credMode}
        onChange={e => setCredMode(e.target.value as 'inline' | 'secret')}
      >
        <FormControlLabel value="inline" control={<Radio size="small" />} label="Enter credentials" />
        <FormControlLabel value="secret" control={<Radio size="small" />} label="Use existing Secret" />
      </RadioGroup>
      {credMode === 'secret' ? (
        <Autocomplete
          options={secretNames}
          value={existingSecret || null}
          onChange={(_, v) => setExistingSecret(v || '')}
          renderInput={params => (
            <TextField
              {...params}
              label="Secret Name"
              required
              sx={{ mt: 1 }}
              helperText={
                <span>
                  Secret must contain keys:{' '}
                  {providerType === 'vsphere' || providerType === 'ovirt'
                    ? <code>user, password, url</code>
                    : providerType === 'openstack'
                    ? <code>username, password, url, authType, domainName, projectName</code>
                    : providerType === 'openshift'
                    ? <code>token, url</code>
                    : <code>user, password</code>}
                  {' '}(base64-encoded in data)
                </span>
              }
            />
          )}
        />
      ) : (
        <>
          <TextField
            fullWidth
            label="Username"
            value={user}
            onChange={e => setUser(e.target.value)}
            required
            placeholder={userPlaceholder}
            sx={{ mt: 1, mb: 2 }}
            helperText={userHelper}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
        </>
      )}
    </Box>
  );

  const renderProviderFields = () => {
    if (!providerType) return null;
    const help = PROVIDER_HELP[providerType];

    return (
      <Box sx={{ mt: 2 }}>
        {/* Contextual help */}
        <Alert severity="info" variant="filled" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{help.title}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, '& li': { fontSize: '0.85rem' } }}>
            {help.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </Box>
        </Alert>

        <TextField
          fullWidth
          label="Provider Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          sx={{ mb: 2 }}
          helperText="Unique name to identify this provider"
        />

        {/* === vSphere fields === */}
        {providerType === 'vsphere' && (
          <>
            <TextField
              fullWidth
              select
              label="Endpoint Type"
              value={vsphereEndpoint}
              onChange={e => setVsphereEndpoint(e.target.value as 'vcenter' | 'esxi')}
              sx={{ mb: 2 }}
              helperText="vCenter manages multiple ESXi hosts; ESXi connects directly to a single host"
            >
              <MenuItem value="vcenter">vCenter Server</MenuItem>
              <MenuItem value="esxi">ESXi Host (standalone)</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="vSphere URL"
              value={vsphereUrl}
              onChange={e => setVsphereUrl(e.target.value)}
              required
              placeholder="https://vcenter.example.com/sdk"
              sx={{ mb: 2 }}
              helperText={
                <span>
                  vCenter/ESXi SDK endpoint — must end with <code>/sdk</code>
                </span>
              }
            />
            {renderCredentialMode(
              vsphereUser, setVsphereUser, vspherePassword, setVspherePassword,
              'administrator@vsphere.local'
            )}

            {/* VDDK */}
            <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                VDDK Init Image
              </Typography>
              <TextField
                fullWidth
                label="VDDK Image URL"
                value={vddkImage}
                onChange={e => setVddkImage(e.target.value)}
                placeholder="registry.example.com/vddk:8.0.3"
                size="small"
                helperText="Container image containing VMware VDDK libraries"
                sx={{ mb: 1 }}
              />
              {!vddkImage && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 1,
                    mb: 1,
                    bgcolor: 'rgba(237, 108, 2, 0.12)',
                    color: 'text.primary',
                    '& .MuiAlert-icon': { color: '#ed6c02' },
                  }}
                >
                  <strong>Without VDDK, only cold migration is available.</strong> Warm migration
                  requires VDDK for Changed Block Tracking (CBT) — it copies only changed disk blocks
                  incrementally, allowing near-zero downtime cutover.
                </Alert>
              )}
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" width={20} />}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Icon icon="mdi:help-circle-outline" width={18} color="#1976d2" />
                    <Typography variant="body2">How to build a VDDK image</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" component="div" sx={{ '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontSize: '0.8rem', userSelect: 'all' }, '& ol': { pl: 2.5, m: 0 }, '& li': { mb: 1.5 } }}>
                    <ol>
                      <li>
                        Download the VDDK SDK from VMware/Broadcom (free account required):<br />
                        <code>developer.broadcom.com</code> → VMware Virtual Disk Development Kit
                      </li>
                      <li>
                        Extract and create a <code>Dockerfile</code>:
                        <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, mt: 0.5, fontSize: '0.8rem', userSelect: 'all', overflow: 'auto' }}>
{`FROM registry.access.redhat.com/ubi9/ubi-minimal
COPY vmware-vix-disklib-distrib /vmware-vix-disklib-distrib`}
                        </Box>
                      </li>
                      <li>
                        Build and push to a registry accessible from the cluster:
                        <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, mt: 0.5, fontSize: '0.8rem', userSelect: 'all', overflow: 'auto' }}>
{`podman build -t registry.example.com/vddk:8.0.3 .
podman push registry.example.com/vddk:8.0.3`}
                        </Box>
                      </li>
                      <li>
                        Enter the image URL above (e.g. <code>registry.example.com/vddk:8.0.3</code>).
                        If the registry is private, configure a pull secret on the cluster.
                      </li>
                    </ol>
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>

            <FormControlLabel
              control={<Checkbox checked={skipTls} onChange={e => setSkipTls(e.target.checked)} />}
              label={
                <span>
                  Skip certificate validation
                  <InfoTip text="Not recommended for production. If unchecked, provide a CA certificate below or the vCenter's CA must be in the cluster's trust store." />
                </span>
              }
              sx={{ mb: 1 }}
            />
            {!skipTls && (
              <TextField
                fullWidth
                label="CA Certificate (PEM)"
                value={caCert}
                onChange={e => setCaCert(e.target.value)}
                multiline
                minRows={3}
                maxRows={6}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                sx={{ mb: 2 }}
                helperText="Paste the vCenter/ESXi CA certificate in PEM format"
              />
            )}
          </>
        )}

        {/* === oVirt fields === */}
        {providerType === 'ovirt' && (
          <>
            <TextField
              fullWidth
              label="Engine API URL"
              value={ovirtUrl}
              onChange={e => setOvirtUrl(e.target.value)}
              required
              placeholder="https://rhvm.example.com/ovirt-engine/api"
              sx={{ mb: 2 }}
              helperText={
                <span>
                  oVirt Engine REST API endpoint — must end with <code>/ovirt-engine/api</code>
                </span>
              }
            />
            {renderCredentialMode(
              ovirtUser, setOvirtUser, ovirtPassword, setOvirtPassword,
              'admin@internal', 'Format: username@domain (e.g. admin@internal)'
            )}
            <FormControlLabel
              control={<Checkbox checked={skipTls} onChange={e => setSkipTls(e.target.checked)} />}
              label={
                <span>
                  Skip certificate validation
                  <InfoTip text="If unchecked, provide the oVirt Engine CA certificate below." />
                </span>
              }
              sx={{ mb: 1 }}
            />
            {!skipTls && (
              <TextField
                fullWidth
                label="CA Certificate (PEM)"
                value={caCert}
                onChange={e => setCaCert(e.target.value)}
                multiline
                minRows={3}
                maxRows={6}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                sx={{ mb: 2 }}
                helperText="Download from https://your-engine/ovirt-engine/services/pki-resource?resource=ca-certificate&format=X509-PEM-CA"
              />
            )}
          </>
        )}

        {/* === OpenStack fields === */}
        {providerType === 'openstack' && (
          <>
            <TextField
              fullWidth
              label="Keystone URL"
              value={openstackUrl}
              onChange={e => setOpenstackUrl(e.target.value)}
              required
              placeholder="https://keystone.example.com:5000/v3"
              sx={{ mb: 2 }}
              helperText="OpenStack Identity (Keystone) v3 endpoint"
            />
            {renderCredentialMode(
              openstackUser, setOpenstackUser, openstackPassword, setOpenstackPassword
            )}
            {credMode === 'inline' && (
              <>
                <TextField
                  fullWidth
                  label="Domain"
                  value={openstackDomain}
                  onChange={e => setOpenstackDomain(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Keystone domain name (usually 'Default')"
                />
                <TextField
                  fullWidth
                  label="Project Name"
                  value={openstackProject}
                  onChange={e => setOpenstackProject(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="OpenStack project/tenant containing the VMs to migrate"
                />
              </>
            )}
            <TextField
              fullWidth
              label="Region"
              value={openstackRegion}
              onChange={e => setOpenstackRegion(e.target.value)}
              sx={{ mb: 2 }}
              helperText="OpenStack region (leave empty for single-region deployments)"
            />
            <FormControlLabel
              control={<Checkbox checked={skipTls} onChange={e => setSkipTls(e.target.checked)} />}
              label="Skip certificate validation"
              sx={{ mb: 1 }}
            />
          </>
        )}

        {/* === OVA fields === */}
        {providerType === 'ova' && (
          <TextField
            fullWidth
            label="NFS Directory"
            value={nfsPath}
            onChange={e => setNfsPath(e.target.value)}
            required
            placeholder="nfs-server:/exports/ova-files"
            sx={{ mb: 2 }}
            helperText="NFS share path containing OVA/OVF files (must be accessible from cluster nodes)"
          />
        )}

        {/* === OpenShift / KubeVirt fields === */}
        {providerType === 'openshift' && (
          <>
            <TextField
              fullWidth
              label="API URL"
              value={openshiftUrl}
              onChange={e => setOpenshiftUrl(e.target.value)}
              placeholder="https://api.cluster.example.com:6443"
              sx={{ mb: 2 }}
              helperText="Leave empty to use the local cluster as the provider"
            />

            {/* Credential mode selector */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Credentials
                <InfoTip text="Enter a ServiceAccount token inline, or reference an existing Secret that already contains the token." />
              </Typography>
              <RadioGroup
                row
                value={credMode}
                onChange={e => setCredMode(e.target.value as 'inline' | 'secret')}
              >
                <FormControlLabel value="inline" control={<Radio size="small" />} label="Enter token" />
                <FormControlLabel value="secret" control={<Radio size="small" />} label="Use existing Secret" />
              </RadioGroup>
            </Box>

            {credMode === 'secret' ? (
              <Autocomplete
                options={secretNames}
                value={existingSecret || null}
                onChange={(_, v) => setExistingSecret(v || '')}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Secret Name"
                    required
                    sx={{ mb: 2 }}
                    helperText={
                      <span>
                        Secret must contain keys: <code>token</code> and <code>url</code> (base64-encoded in data)
                      </span>
                    }
                  />
                )}
              />
            ) : (
            <TextField
              fullWidth
              label="ServiceAccount Token"
              value={openshiftToken}
              onChange={e => setOpenshiftToken(e.target.value)}
              multiline
              minRows={2}
              maxRows={4}
              sx={{ mb: 2 }}
              helperText={
                <span>
                  Token from a ServiceAccount with KubeVirt access. Create one with:
                  <code style={{ display: 'block', marginTop: 4 }}>
                    kubectl create token forklift-controller -n konveyor-forklift --duration=8760h
                  </code>
                </span>
              }
            />
            )}
            <FormControlLabel
              control={<Checkbox checked={skipTls} onChange={e => setSkipTls(e.target.checked)} />}
              label={
                <span>
                  Skip certificate validation
                  <InfoTip text="If the remote cluster uses a self-signed certificate, either skip validation or provide the CA cert." />
                </span>
              }
              sx={{ mb: 1 }}
            />
          </>
        )}
      </Box>
    );
  };

  const buildProviderObject = () => ({
    apiVersion: 'forklift.konveyor.io/v1beta1',
    kind: 'Provider',
    metadata: { name, namespace },
    spec: buildProviderSpec(),
  });

  const renderReview = () => {
    if (!providerType) return null;
    const meta = PROVIDER_TYPE_META[providerType];
    const url = getUrl();
    const secretName = credMode === 'secret' ? existingSecret : `${name}-secret`;

    const rows: Array<[string, React.ReactNode]> = [
      ['Name', name],
      ['Type', <Box key="t" display="flex" alignItems="center" gap={0.5}><Icon icon={meta.icon} width={16} color={meta.color} />{meta.label}</Box>],
      ['Namespace', namespace],
    ];
    if (url) rows.push(['Endpoint', url]);
    if (providerType === 'vsphere') {
      rows.push(['SDK Endpoint', vsphereEndpoint]);
      rows.push(['VDDK', vddkImage || 'Not configured (cold migration only)']);
    }
    rows.push(['TLS', skipTls ? 'Validation skipped' : 'Validated']);
    if (providerType !== 'ova') {
      rows.push(['Secret', `${secretName} (${credMode === 'secret' ? 'existing' : 'will be created'})`]);
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Provider Summary</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 1, mb: 2 }}>
          {rows.map(([label, value], i) => (
            <React.Fragment key={i}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body2" fontWeight={500} component="div">{value}</Typography>
            </React.Fragment>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Accordion
          disableGutters
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" width={20} />}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Icon icon="mdi:code-braces" width={18} />
              <Typography variant="body2">YAML Preview</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0, position: 'relative' }}>
            <Tooltip title="Copy YAML" arrow>
              <IconButton
                size="small"
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(toYaml(buildProviderObject())); }}
                sx={{ position: 'absolute', top: 8, right: 16, zIndex: 1 }}
              >
                <Icon icon="mdi:content-copy" width={16} />
              </IconButton>
            </Tooltip>
            <Box
              component="pre"
              sx={{ bgcolor: 'action.hover', color: 'text.primary', p: 2, pr: 5, m: 0, fontSize: '0.78rem', overflow: 'auto', maxHeight: 300, userSelect: 'all' }}
            >
              {toYaml(buildProviderObject())}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const isStep1Valid = () => {
    if (!name) return false;
    // If using existing secret, just need the secret name (for non-OVA providers)
    const hasCredentials = credMode === 'secret' ? !!existingSecret : true;
    switch (providerType) {
      case 'vsphere':
        return !!vsphereUrl && hasCredentials &&
          (credMode === 'secret' || (!!vsphereUser && !!vspherePassword));
      case 'ovirt':
        return !!ovirtUrl && hasCredentials &&
          (credMode === 'secret' || (!!ovirtUser && !!ovirtPassword));
      case 'openstack':
        return !!openstackUrl && hasCredentials &&
          (credMode === 'secret' || (!!openstackUser && !!openstackPassword));
      case 'ova': return !!nfsPath;
      case 'openshift':
        return credMode === 'secret' ? !!existingSecret : true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Icon icon="mdi:server-plus" width={24} />
          Add Provider
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ my: 2 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Select provider type */}
        {step === 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select the type of virtualization platform you want to migrate VMs from.
            </Typography>
            <Grid container spacing={2}>
              {SOURCE_TYPES.map(type => {
                const meta = PROVIDER_TYPE_META[type];
                return (
                  <Grid item xs={12} sm={6} md={4} key={type}>
                    <Card
                      variant="outlined"
                      onClick={() => setProviderType(type)}
                      sx={{
                        cursor: 'pointer',
                        borderColor: providerType === type ? meta.color : 'divider',
                        borderWidth: providerType === type ? 2 : 1,
                        bgcolor: providerType === type ? `${meta.color}15` : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: meta.color },
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Icon icon={meta.icon} width={40} color={meta.color} />
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
                          {meta.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {/* Step 1: Connection details (per-provider) */}
        {step === 1 && renderProviderFields()}

        {/* Step 2: Review */}
        {step === 2 && renderReview()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Box flex={1} />
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep(s => s + 1)}
            disabled={(step === 0 && !providerType) || (step === 1 && !isStep1Valid())}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !name || !providerType}
            startIcon={
              creating ? <Icon icon="mdi:loading" className="spin" /> : <Icon icon="mdi:check" />
            }
          >
            {creating ? 'Creating...' : 'Create Provider'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
