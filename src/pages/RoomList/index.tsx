import { getSpyRoom } from '@/apis';
import {
  OS_CONFIG,
  getBrowserLogo,
  getBrowserName,
  parseUserAgent,
} from '@/utils/brand';
import { useRequest } from 'ahooks';
import {
  Typography,
  Row,
  Col,
  message,
  Empty,
  Button,
  Tooltip,
  Input,
  Form,
  Select,
  Space,
} from 'antd';
import clsx from 'clsx';
import { PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.less';
import { Link } from 'react-router-dom';
import { SpyDevice } from '@huolala-tech/page-spy-types';

const { Title } = Typography;
const { Option } = Select;

const sortConnections = (data: I.SpyRoom[]) => {
  const [valid, invalid] = (data || []).reduce(
    (acc, cur) => {
      const hasClient =
        cur.connections.findIndex((i) => i.userId === 'Client') > -1;
      if (hasClient) acc[0].push(cur);
      else acc[1].push(cur);
      return acc;
    },
    [[], []] as I.SpyRoom[][],
  );

  return [...valid, ...invalid];
};

const filterConnections = (
  data: I.SpyRoom[],
  condition: Record<'title' | 'address' | 'os' | 'browser', string>,
) => {
  const { title = '', address = '', os = '', browser = '' } = condition;
  const lowerCaseTitle = String(title).trim().toLowerCase();
  return data
    .filter(({ tags }) => {
      return String(tags.title).toLowerCase().includes(lowerCaseTitle);
    })
    .filter((i) => i.address.slice(0, 4).includes(address || ''))
    .filter(({ name }) => {
      const clientInfo = parseUserAgent(name);
      return (
        (!os || clientInfo.os.type === os) &&
        (!browser || clientInfo.browser.type === browser)
      );
    });
};

const ConnDetailItem = ({
  title,
  children,
}: PropsWithChildren<{ title: string }>) => {
  return (
    <div className="conn-detail">
      <p className="conn-detail__title">{title}</p>
      <div className="conn-detail__value">{children}</div>
    </div>
  );
};

export const RoomList = () => {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const BrowserOptions = useMemo(() => {
    const browsers: SpyDevice.Browser[] = [
      'chrome',
      'firefox',
      'safari',
      'edge',
      'qq',
      'wechat',
      'uc',
      'baidu',
    ];
    const mpTypes: SpyDevice.Browser[] = ['mp-wechat', 'mp-alipay'];
    return [
      {
        groupName: 'Web',
        options: browsers.map((name) => {
          return {
            name,
            label: getBrowserName(name),
            logo: getBrowserLogo(name),
          };
        }),
      },
      {
        groupName: t('common.miniprogram'),
        options: mpTypes.map((name) => {
          return {
            name,
            label: getBrowserName(name),
            logo: getBrowserLogo(name),
          };
        }),
      },
    ];
  }, []);

  const {
    data: connectionList = [],
    error,
    runAsync: requestConnections,
  } = useRequest(
    async (group = '') => {
      const res = await getSpyRoom(group);
      return res.data;
    },
    {
      pollingInterval: 5000,
      pollingWhenHidden: false,
      pollingErrorRetryCount: 0,
      onError(e) {
        message.error(e.message);
      },
    },
  );

  const [conditions, setConditions] = useState({
    title: '',
    address: '',
    os: '',
    browser: '',
  });
  const onFormFinish = useCallback(
    async (value: any) => {
      try {
        await requestConnections(value.project);

        setConditions((state) => ({
          ...state,
          ...value,
        }));
      } catch (e: any) {
        message.error(e.message);
      }
    },
    [requestConnections],
  );

  const mainContent = useMemo(() => {
    if (error || connectionList.length === 0)
      return (
        <Empty
          style={{
            marginTop: 60,
          }}
        />
      );

    const list = sortConnections(filterConnections(connectionList, conditions));

    return (
      <Row gutter={24}>
        {list.map(({ address, name, connections, group, tags }) => {
          const simpleAddress = address.slice(0, 4);
          const { os, browser } = parseUserAgent(name);
          const client = connections.find(({ userId }) => userId === 'Client');

          return (
            <Col key={address} span={6}>
              <div className={clsx('connection-item')}>
                <div className="connection-item__title">
                  <code style={{ fontSize: 36 }}>
                    <b>{simpleAddress}</b>
                  </code>
                  <Tooltip
                    title={`Title: ${tags.title?.toString() || '--'}`}
                    placement="right"
                  >
                    <div className="custom-title">
                      {tags.title?.toString() || '--'}
                    </div>
                  </Tooltip>
                </div>
                <Row wrap={false} style={{ marginBlock: 8 }}>
                  <Col flex={1}>
                    <ConnDetailItem title="Project">
                      <Tooltip title={group}>
                        <p style={{ fontSize: 16 }}>{group}</p>
                      </Tooltip>
                    </ConnDetailItem>
                  </Col>
                  <Col flex={1}>
                    <ConnDetailItem title="OS">
                      <Tooltip title={`${os.name} ${os.version}`}>
                        <img src={os.logo} alt="os logo" />
                      </Tooltip>
                    </ConnDetailItem>
                  </Col>
                  <Col flex={1}>
                    <ConnDetailItem title="Browser">
                      <Tooltip title={`${browser.name} ${browser.version}`}>
                        <img src={browser.logo} alt="browser logo" />
                      </Tooltip>
                    </ConnDetailItem>
                  </Col>
                </Row>
                <Tooltip
                  title={!client && t('socket.client-not-in-connection')}
                >
                  <div>
                    <Button
                      type="primary"
                      disabled={!client}
                      style={{
                        width: '100%',
                        pointerEvents: !client ? 'none' : 'auto',
                      }}
                      shape="round"
                    >
                      {!client ? (
                        t('common.debug')
                      ) : (
                        <Link
                          to={`/devtools?address=${address}`}
                          target="_blank"
                          style={{ display: 'block' }}
                        >
                          {t('common.debug')}
                        </Link>
                      )}
                    </Button>
                  </div>
                </Tooltip>
              </div>
            </Col>
          );
        })}
      </Row>
    );
  }, [conditions, connectionList, error, t]);

  return (
    <div className="room-list">
      <div className="room-list-content">
        <Title level={3} style={{ marginBottom: 12 }}>
          {t('common.connections')}
        </Title>
        <Form
          form={form}
          onFinish={onFormFinish}
          labelCol={{
            span: 6,
          }}
        >
          <Row gutter={24} wrap>
            <Col span={8}>
              <Form.Item label={t('common.project')} name="project">
                <Input placeholder={t('common.project')!} allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('common.title')} name="title">
                <Input placeholder={t('common.title')!} allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('common.device-id')} name="address">
                <Input placeholder={t('common.device-id')!} allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('common.os')} name="os">
                <Select placeholder={t('connections.select-os')} allowClear>
                  {Object.entries(OS_CONFIG).map(([name, conf]) => {
                    return (
                      <Option value={name} key={name}>
                        <div className="flex-between">
                          <span>{conf.label}</span>
                          <img src={conf.logo} width="20" height="20" alt="" />
                        </div>
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('common.browser')} name="browser">
                <Select
                  listHeight={500}
                  placeholder={t('connections.select-browser')}
                  allowClear
                >
                  {BrowserOptions.map((group) => {
                    return (
                      <Select.OptGroup
                        label={group.groupName}
                        key={group.groupName}
                      >
                        {group.options.map(({ name, logo, label }) => {
                          return (
                            <Option key={name} value={name}>
                              <div className="flex-between">
                                <span>{label}</span>
                                <img src={logo} width="20" height="20" alt="" />
                              </div>
                            </Option>
                          );
                        })}
                      </Select.OptGroup>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end">
            <Col>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {t('common.search')}
                  </Button>
                  <Button
                    type="default"
                    onClick={() => {
                      form.resetFields();
                      form.submit();
                    }}
                  >
                    {t('common.reset')}
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        {mainContent}
      </div>
    </div>
  );
};
