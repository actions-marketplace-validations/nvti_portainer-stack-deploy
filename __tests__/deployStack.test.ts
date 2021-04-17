import {install, uninstall, mockRequest, m, MockAssert} from 'mappersmith/test'
import deployStack from '../src/deployStack'

interface MockRequestCall {
  requestParams: object
}

jest.mock('@actions/core')

process.env.GITHUB_WORKSPACE = './'

describe('deployStack', () => {
  let updateStackMock: MockAssert

  beforeEach(() => {
    install()

    mockRequest({
      method: 'post',
      url: 'http://mock.url/api/auth',
      body: JSON.stringify({username: 'username', password: 'password'}),
      response: {
        status: 200,
        body: {jwt: 'token'}
      }
    })

    mockRequest({
      method: 'get',
      url: 'http://mock.url/api/stacks',
      response: {
        status: 200,
        body: [{Id: 2, Name: 'stack-name', EndpointId: 1}]
      }
    })

    updateStackMock = mockRequest({
      method: 'put',
      url: 'http://mock.url/api/stacks/2?endpointId=1',
      body: m.anything(),
      response: {
        status: 200
      }
    })

    mockRequest({
      method: 'post',
      url: 'http://mock.url/api/auth/logout',
      response: {
        status: 200
      }
    })
  })

  afterEach(() => uninstall())

  test('deploy new stack', async () => {
    await deployStack({
      portainerHost: 'http://mock.url',
      username: 'username',
      password: 'password',
      stackName: 'stack-name',
      stackDefinitionFile: 'example-stack-definition.yml',
      image: 'docker.pkg.github.com/username/repo/master:sha-0142c14'
    })
    expect(updateStackMock.callsCount()).toBe(1)
    const updateStackCall = updateStackMock.mostRecentCall() as unknown
    expect((updateStackCall as MockRequestCall).requestParams).toEqual({
      id: 2,
      endpointId: 1,
      headers: {
        Authorization: 'Bearer token',
        'content-type': 'application/json;charset=utf-8'
      },
      body:
        '{"stackFileContent":"version: \\"3.7\\"\\n\\nservices:\\n  server:\\n    image: docker.pkg.github.com/username/repo/master:sha-0142c14\\n    deploy:\\n      update_config:\\n        order: start-first\\n"}'
    })
  })
})