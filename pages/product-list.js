import Layout from '../components/Layout'

export default function ProductList() {
    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">产品列表</h2>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        添加产品
                    </button>
                </div>

                {/* 产品列表表格 */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">产品名称</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">价格</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[1, 2, 3, 4, 5].map((item) => (
                                    <tr key={item}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">产品{item}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{item * 100}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item * 50}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                在售
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button className="text-blue-600 hover:text-blue-900 mr-3">编辑</button>
                                            <button className="text-red-600 hover:text-red-900">删除</button>
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