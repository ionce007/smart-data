import { BaseModule } from './base.module';
import xhsData from '@/lib/services/xhsdata';
import { findValue } from '@/lib';

export class XHSModule extends BaseModule {
    constructor() {
        super('common');
        // 注册方法描述（用于 MCP 协议）
        this.methodDescriptions = {
            taxonomy: '获取所有的行业类目',
            taxonomyAttr: '根据ID获取行业类目属性',
            keywordMatch: '获取关键词匹配词库信息',
            targetInfo: '获取定向信息',
            product: '获取行业商品列表',
            notelist: '获取笔记列表',
            recommend: '定向推词-以词推词',
            keywordInfo: '获取推荐关键词信息',
            baglist: '获取词包推荐列表',
            crowdEstimate: '获取人群预估信息',
            checkDup: '计划单元名称重复性校验'
        };
        this.methodParameters = {
            taxonomy: {
                type: 'object',
                properties: {},
                description: '获取所有的行业类目'
            },
            taxonomyAttr: {
                type: 'object',
                required: ['taxId'],
                properties: {
                    taxId: { type: 'string' },
                    validator: async (value) => {
                        const taxes = await xhsData.taxonomy();
                        const obj = findValue(taxes.data.ads_industry_taxonomy_dict_dto, 'taxonomy_id', value);
                        return !!obj;
                    },
                    description: '行业类目id，可通过平台API获取'
                },
                description: '根据ID获取行业类目属性'
            },
            keywordMatch: {
                type: 'object',
                required: ['keys'],
                properties: {
                    keys: { type: 'string', description: '关键词列表,不超过150个,多个关键词之间用,分隔' },
                },
                description: '获取关键词匹配词库信息'
            },
            targetInfo: {
                type: 'object',
                properties: {
                    market: {
                        type: 'integer',
                        validator: (value) => { return [3, 4, 8, 9, 10, 13, 14, 15, 16].indexOf(value) >= 0; },
                        description: '营销目标: 3-商品销量  4-产品种草  8-直播推广  9-客资收集  10-抢占关键词  13-种草直达  14-直播预热  15-店铺拉新  16-应用推广'
                    }
                },
                description: '获取定向信息，包含性别,年龄,地域,设备,平台推荐,行业兴趣,人群包定向'
            },
            product: {
                type: 'object',
                properties: {
                    pn: {
                        type: 'integer',
                        description: '页码'
                    },
                    ps: {
                        type: 'integer',
                        description: '每页大小，建议第一次不超过20'
                    },
                    ids: {
                        type: 'string',
                        description: '行业商品主键ID，多个ID用,闹中间隔'
                    },
                    pf: {
                        type: 'string',
                        description: '行业商品平台，多个平台时用,间隔；默认不传，会返回账号下所有商品。1-淘宝；2-京东；3-拼多多；6-淘宝ud(从阿里推送过来的商品，联合投放-种草直达传这个)；7-京东ud（从京东推送过来的商品，投jdsmart链路时传这个）'
                    }
                },
                description: '获取行业商品列表'
            },
            notelist: {
                type: 'object',
                required: ['nt'],
                properties: {
                    nt: {
                        type: 'integer',
                        validator: (value) => { return [1, 2, 4, 6, 11, 12, 13].indexOf(value) >= 0; },
                        description: '笔记类型，1 - 我的笔记   2 - 合作笔记   4 - 主理人笔记   6 - 员工笔记   11 - 授权笔记   12 - 素材笔记   13 - 合作码笔记'
                    },
                    kw: {
                        type: 'string',
                        description: '搜索关键词, 笔记 id 或者笔记名称，传多个笔记id时以,分隔，最大数量不超过100'
                    },
                    of: {
                        type: 'string',
                        description: '排序字段，可选；阅读数: read_count  互动数: interact_count   阅读率: read_rate   互动率: interact_rate   创建时间: create_time'
                    },
                    ot: {
                        type: 'string',
                        description: '升降序， 正排:asc  倒排:desc  默认desc'
                    },
                    nct: {
                        type: 'integer',
                        description: '笔记类型： 1 - 图文笔记   2 - 视频笔记'
                    },
                    pt: {
                        type: 'integer',
                        validator: (value) => { return [1, 2, 3, 4, 7].indexOf(value) >= 0; },
                        description: '推广场景：1 - 信息流推广  2 - 搜索推广  3 - 开屏推广  4 - 全站智投  7 - 视频内流'
                    },
                    spu_id: {
                        type: 'string',
                        description: 'spu_id, 白名单支持'
                    },
                    ft: {
                        type: 'integer',
                        description: '是否只展示小红星笔记： 0 - 展示所有  1 - 仅小红星'
                    },
                    mt: {
                        type: 'integer',
                        validator: (value) => { return [4, 9, 16].indexOf(value) >= 0; },
                        description: '营销诉求  4 - 产品种草  9 - 客资收集  16 - 应用换端'
                    },
                    spu_type: {
                        type: 'integer',
                        validator: (value) => { return [1, 2, 3].indexOf(value) >= 0; },
                        description: 'spu_type, 白名单支持, 1 - spu   2 - 非标品  3 - 品牌推广'
                    },
                    pn: {
                        type: 'integer',
                        description: '请求的页码，默认为 1'
                    },
                    ps: {
                        type: 'integer',
                        description: '每页行数，默认为 20，最大100'
                    },
                    bo: {
                        type: 'boolean',
                        description: '是否只取笔记基本信息，开启后只拉取笔记基本信息不拉取指标信息推荐拉取笔记基础信息场景开启，可优化接口响应时间，默认为false, 推荐只拉取笔记基本信息，耗时短'
                    },
                    cst: {
                        type: 'string',
                        description: '笔记创建的查询范围开始时间 (yyyy-MM-dd格式，例：2025-10-20)'
                    },
                    cet: {
                        type: 'string',
                        description: '笔记创建的查询范围结束时间 (yyyy-MM-dd格式，例：2025-10-21)'
                    },
                    ust: {
                        type: 'string',
                        description: '笔记更新的查询范围开始时间 (合作码和广告素材不支持更新时间字段筛选)'
                    },
                    uet: {
                        type: 'string',
                        description: '笔记更新的查询范围开始时间 (合作码和广告素材不支持更新时间字段筛选)'
                    }
                },
                description: '获取笔记列表，该接口只对有创编权限（ad_manage l 创建&修改推广计划、推广单元、推广创意）的开发者生效'
            },
            recommend: {
                type: 'object',
                required: ['rt'],
                properties: {
                    rt: {
                        type: 'string',
                        validator: (value) => { return ['note', 'industry', 'search', 'session'].indexOf(value) >= 0; },
                        description: '推词类型， note: 智能推词-笔记推词   industry: 行业推词   search: 以词推词   session: 上下游推词'
                    },
                    pt: {
                        type: 'integer',
                        description: '推广目标，智能推词-笔记推词必传，1 - 笔记   2 - 商品   7 - 自由链接   9 - 落地页   18 - 直播间'
                    },
                    rrf: {
                        type: 'string',
                        description: '推荐理由过滤，多个理由用“,”间隔，智能推词-笔记推词：高点击   行业推词：高点击   以词推词：高点击   上下游推词：上游、下游'
                    },
                    keyword: {
                        type: 'string',
                        description: '以词推词(search)、上下游推词(session)必填'
                    },
                    ids: {
                        type: 'string',
                        description: '笔记ids，智能推词-笔记推词必传'
                    },
                    taxId: {
                        type: 'string',
                        description: '行业id，行业推词下必传'
                    },
                    al: {
                        type: 'string',
                        description: '行业属性列表'
                    },
                    anl: {
                        type: 'string',
                        description: '行业属性名称列表'
                    },
                    rank: {
                        type: 'integer',
                        description: '排序  1 - pv降序   2 - pv升序   3 - 竞争指数降序   4 - 竞争指数升序'
                    }
                },
                description: '定向推词-以词推词'
            },
            keywordInfo: {
                type: 'object',
                properties: {
                    ids: {
                        type: 'string',
                        description: '笔记Id列表，多个笔记ID用“,”间隔'
                    },
                    keyword: {
                        type: 'string',
                        description: '搜索词'
                    }
                },
                description: '获取推荐关键词信息'
            },
            baglist: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: '搜索的词包名称'
                    },
                    category: {
                        type: 'string',
                        description: '状态枚举，通用：通用型词包   其他：通过接口/api/taxonomy获取，一级类目taxonomy_id'
                    },
                    pn: {
                        type: 'integer',
                        description: '请求的页码，默认为 1'
                    },
                    ps: {
                        type: 'integer',
                        description: '每页行数，默认为 5，最大5'
                    },
                    st: {
                        type: 'string',
                        description: '开始时间，示例："2024-02-01"'
                    },
                    et: {
                        type: 'string',
                        description: '结束时间，示例："2024-02-01"'
                    }
                },
                description: '词包推荐'
            },
            checkDup: {
                type: 'object',
                required: ['type', 'name'],
                properties: {
                    type: {
                        type: 'integer',
                        validator: (value) => { return [1, 2].indexOf(value) >= 0; },
                        description: '查询类型：1 - 计划   2 - 单元'
                    },
                    name: {
                        type: 'string',
                        validator: (value) => { return [1, 2].indexOf(value) >= 0; },
                        description: '计划名称/单元名称集合,单次查询上限为100，多个名称用“,”间隔'
                    }
                },
                description: '计划单元名称重复性校验'
            },
            crowdEstimate: {
                type: 'object',
                required: ['type', 'name'],
                properties: {
                    mt: {
                        type: 'integer',
                        validator: (value) => { return [3, 4, 8, 9, 10, 13, 14].indexOf(value) >= 0; },
                        description: '营销目标  3 - 商品销量   4 - 笔记种草   8 - 直播推广   9 - 客资收集   10 - 抢占赛道   13 - 种草直达   14 - 直播预热'
                    },
                    placement: {
                        type: 'integer',
                        validator: (value) => { return [1, 2, 4, 7].indexOf(value) >= 0; },
                        description: '广告类型   1 - 信息流   2 - 搜索推广   4 - 全站智投   7 - 视频内流'
                    },
                    ot: {
                        type: 'integer',
                        validator: (value) => { return [0, 1, 3, 4, 5, 6, 11, 12, 13, 14, 18, 20, 21, 23, 24, 25].indexOf(value) >= 0; },
                        description: '推广目标  0 - 点击量   1 - 互动量   3 - 表单提交量   4 - 商品成单量   5 - 私信咨询量   6 - 直播间观看量   11 - 商品访客量   12 - 落地页访问量   13 - 私信开口量   14 - 有效观看量   18 - 站外转化量   20 - TI人群规模   21 - 行业商品成单   23 - 直播预热量   24 - 直播间成交   25 - 直播间支付ROI'
                    },
                    tt: {
                        type: 'integer',
                        validator: (value) => { return [1, 2, 3].indexOf(value) >= 0; },
                        description: '定向类型， 1 - 通投   2 - 智能定向   3 - 高级定向'
                    },
                    tc: {
                        type: 'object',
                        description: '定向配置',
                        properties: {
                            target_gender: {
                                type: 'string',
                                validator: (value) => { return ['all', '0', '1'].indexOf(value) >= 0; },
                                description: '性别，all - 不限   0 - 男   1 - 女'
                            },
                            target_age: {
                                type: 'string',
                                description: '年龄，不限：all, 细分年龄段：18-22, 23-27, 28-32, 33-100，细分年龄后多个年龄段用#号分隔，如18-22#23-27'
                            },
                            target_area_code: {
                                type: 'string',
                                description: '地域定向城市编码，不限传-1，城市编码可通过/api/targetInfo接口获取，多个城市用#分割'
                            },
                            target_device: {
                                type: 'string',
                                description: '设备，不限: all, 苹果: ios, 安卓: android'
                            },
                            industry_interest_target: {
                                type: 'object',
                                description: '兴趣定向，值来自于/api/targetInfo接口返回的industry_interest_target',
                                properties: {
                                    code: { type: 'string' },
                                    name: { type: 'string' },
                                    children: {
                                        type: 'object',
                                        description: '子节点',
                                    }
                                }
                            },
                            crowd_target: {
                                type: 'object',
                                description: 'dmp人群包定向， 值来自于/api/crowd_target',
                                properties: {
                                    crowd_target: {
                                        type: 'object',
                                        description: '平台推荐人群、dmp人群包都有该字段值来自于定向信息接口的返回的crowd_target'
                                    },
                                    crowd_pkg: { type: 'object' },
                                    value: { type: 'string', description: '人群包ID' },
                                    name: { type: 'string', description: '人群包名称' }
                                }
                            },
                            interest_keywords: {
                                type: 'string[]',
                                description: '关键词兴趣定向'
                            },
                            keywords: {
                                type: 'string[]',
                                description: '关键词行为定向'
                            },
                            keyword_target_period: {
                                type: 'integer',
                                description: '关键词时间周期，单位天，枚举包括 3，7，15，30,关键词行为定向选择时必填'
                            },
                            keyword_target_action: {
                                type: 'integer[]',
                                description: '关键词行为类型，关键词行为定向选择时必填。1 - 搜索   2 - 互动   3 - 阅读'
                            }
                        }
                    }
                },
                description: '人群预估'
            }
        };
    }

    getMethodDescription(methodName) {
        return this.methodDescriptions[methodName] || `${this.name} module method`;
    }

    getMethodParameters(methodName) {
        return this.methodParameters[methodName] || {};
    }

    async taxonomy(params, context) {
        return xhsData.taxonomy();
    }
    async taxonomyAttr(params, context) {
        return xhsData.taxonomyAttr(params);
    }
    async keywordMatch(params, context) {
        return xhsData.keywordMatch(params);
    }
    async targetInfo(params, context) {
        return xhsData.targetInfo(params);
    }
    async product(params, context) {
        return xhsData.product(params);
    }
    async notelist(params, context) {
        return xhsData.notelist(params);
    }
    async recommend(params, context) {
        return xhsData.recommend(params);
    }
    async keywordInfo(params, context) {
        return xhsData.keywordInfo(params);
    }
    async baglist(params, context) {
        return xhsData.baglist(params);
    }
    async crowdEstimate(params, context) {
        return xhsData.crowdEstimate(params);
    }
    async checkDup(params, context) {
        return xhsData.checkDup(params);
    }
}