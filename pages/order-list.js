import Layout from '../components/Layout'

export default function OrderList() {
    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">订单列表</h2>
                    <div className="space-x-2">
                        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                            导出报表
                        </button>
                    </div>
                </div>

                {/* 订单列表表格 */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单号</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">下单时间</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[1, 2, 3, 4, 5].map((item) => (
                                    <tr key={item}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#ORD-00{item}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">张三</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{item * 100}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2024-01-0{item}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                已完成
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button className="text-blue-600 hover:text-blue-900">查看详情</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    )
}